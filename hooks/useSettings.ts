
import React, { useState, useEffect, useRef } from 'react';
import type { TranslationSettings, GlossaryTerm } from '../types';
import { MatchType } from '../types';
import { DEFAULT_GLOSSARY_EXTRACTION_INSTRUCTIONS, DEFAULT_EXCLUSION_LIST } from '../constants';

import { persistenceService } from '../services/persistenceService';

export const useSettings = () => {
  const [settings, setSettings] = useState<TranslationSettings>({
    aiProvider: 'gemini',
    geminiApiKey: '',
    openaiApiKey: '',
    openaiApiEndpoint: 'https://api.openai.com/v1/chat/completions',
    deepseekApiKey: '',
    deepseekApiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    glossary: [],
    useGlossaryAI: true,
    defaultMatchType: MatchType.CaseInsensitive,
    customInstructions: '',
    glossaryExtractionInstructions: '',
    exclusionList: DEFAULT_EXCLUSION_LIST,
  });
  const [editingTermInGlossaryViewId, setEditingTermInGlossaryViewId] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        let savedSettings: any = null;
        let settingsStr = localStorage.getItem('ai-novel-weaver-settings');
        if (settingsStr) {
           savedSettings = JSON.parse(settingsStr);
        }

        // Load glossary from IDB
        let idbGlossary = await persistenceService.loadGlossary('global');

        if (savedSettings) {
          const parsedSettings = savedSettings;
          if (!parsedSettings.aiProvider) parsedSettings.aiProvider = 'gemini';
          if (!parsedSettings.geminiApiKey) parsedSettings.geminiApiKey = '';
          if (!parsedSettings.openaiApiKey) parsedSettings.openaiApiKey = '';
          if (!parsedSettings.openaiApiEndpoint) parsedSettings.openaiApiEndpoint = 'https://api.openai.com/v1/chat/completions';
          if (!parsedSettings.deepseekApiKey) parsedSettings.deepseekApiKey = '';
          if (!parsedSettings.deepseekApiEndpoint) parsedSettings.deepseekApiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
          if (!parsedSettings.defaultMatchType) parsedSettings.defaultMatchType = MatchType.CaseInsensitive;

          if (parsedSettings.glossaryExtractionInstructions === DEFAULT_GLOSSARY_EXTRACTION_INSTRUCTIONS) {
              parsedSettings.glossaryExtractionInstructions = '';
          }

          delete parsedSettings.useProxy;
          delete parsedSettings.proxyType;
          delete parsedSettings.proxyDetails;
          delete parsedSettings.proxyBridgeUrl;
          delete parsedSettings.importContentSelector;
          delete parsedSettings.importProxyUrl;

          // Migrate glossary from localStorage to IDB if it exists in LS but not in IDB
          if (parsedSettings.glossary && parsedSettings.glossary.length > 0 && idbGlossary.length === 0) {
              parsedSettings.glossary = parsedSettings.glossary.map((t: any) => ({
                  ...t,
                  matchType: (t.matchType === 'Không xác định' || !t.matchType) ? MatchType.CaseInsensitive : t.matchType
              }));
              idbGlossary = parsedSettings.glossary;
              await persistenceService.saveGlossary('global', idbGlossary);
          }
          delete parsedSettings.glossary; // Remove from LS structure

          setSettings(prev => {
            const merged = { ...prev, ...parsedSettings, glossary: idbGlossary };
            return merged;
          });
        } else if (idbGlossary.length > 0) {
          setSettings(prev => ({ ...prev, glossary: idbGlossary }));
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage/IDB", error);
      }
    };

    loadSettingsData();
  }, []);

  const handleSettingsChange = (updater: React.SetStateAction<TranslationSettings>) => {
    setSettings(prevSettings => {
      const newSettings = typeof updater === 'function' ? updater(prevSettings) : updater;
      try {
        const { glossary, ...settingsWithoutGlossary } = newSettings;
        localStorage.setItem('ai-novel-weaver-settings', JSON.stringify(settingsWithoutGlossary));
        // Save glossary to IDB. Async so it won't block.
        persistenceService.saveGlossary('global', glossary).catch(e => console.error(e));
      } catch (error) {
        console.error("Failed to save settings", error);
      }
      return newSettings;
    });
  };

  const handleGlossaryTermUpdate = (updatedTerm: GlossaryTerm) => {
    handleSettingsChange(prev => ({
      ...prev,
      glossary: prev.glossary.map(term => term.id === updatedTerm.id ? updatedTerm : term)
    }));
  };

  return {
    settings,
    editingTermInGlossaryViewId,
    handleSettingsChange,
    handleGlossaryTermUpdate,
    setEditingTermInGlossaryViewId,
  };
};
