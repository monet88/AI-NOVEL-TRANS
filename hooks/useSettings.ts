import React, { useEffect, useRef, useState } from 'react';
import type { GlossaryTerm, TranslationSettings } from '../types';
import { MatchType } from '../types';
import { TranslationSettingsSchema } from '../schema';
import { DEFAULT_EXCLUSION_LIST, DEFAULT_GLOSSARY_EXTRACTION_INSTRUCTIONS } from '../constants';
import { persistenceService } from '../services/persistenceService';

const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_LOCAL_MT_ENDPOINT = 'http://localhost:8000';

type PersistedGlossaryTerm = {
  id?: string;
  input: string;
  translation: string;
  gender?: string;
  matchType?: string;
  variants?: string[];
};

type PersistedSettings = Partial<TranslationSettings> & {
  glossary?: PersistedGlossaryTerm[];
  useProxy?: unknown;
  proxyType?: unknown;
  proxyDetails?: unknown;
  proxyBridgeUrl?: unknown;
  importContentSelector?: unknown;
  importProxyUrl?: unknown;
};

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  aiProvider: 'gemini',
  geminiApiKey: '',
  openaiApiKey: '',
  openaiApiEndpoint: DEFAULT_OPENAI_ENDPOINT,
  deepseekApiKey: '',
  deepseekApiEndpoint: DEFAULT_DEEPSEEK_ENDPOINT,
  localMtEndpoint: DEFAULT_LOCAL_MT_ENDPOINT,
  localMtMode: 'offline',
  localMtHybridTarget: 'client',
  localMtGlossaryProvider: 'none',
  glossary: [],
  useGlossaryAI: true,
  defaultMatchType: 'Case-Insensitive',
  customInstructions: '',
  glossaryExtractionInstructions: '',
  exclusionList: DEFAULT_EXCLUSION_LIST,
};

const normalizeGlossaryTerms = (glossary: PersistedGlossaryTerm[]): GlossaryTerm[] => {
  return glossary.map((term) => {
    const normalizedTerm: GlossaryTerm = {
      id: term.id ?? `persisted-${term.input}`,
      input: term.input,
      translation: term.translation,
      gender:
        term.gender === 'Male' ||
        term.gender === 'Female' ||
        term.gender === 'Neutral' ||
        term.gender === 'Không xác định'
          ? term.gender
          : 'Không xác định',
      matchType: term.matchType === MatchType.Exact ? 'Exact' : 'Case-Insensitive',
    };

    if (Array.isArray(term.variants) && term.variants.length > 0) {
      normalizedTerm.variants = term.variants.filter((variant) => typeof variant === 'string' && variant.trim() !== '');
    }

    return normalizedTerm;
  });
};

const stripDeprecatedSettings = (settings: PersistedSettings): PersistedSettings => {
  const cleanedSettings = { ...settings };
  delete cleanedSettings.useProxy;
  delete cleanedSettings.proxyType;
  delete cleanedSettings.proxyDetails;
  delete cleanedSettings.proxyBridgeUrl;
  delete cleanedSettings.importContentSelector;
  delete cleanedSettings.importProxyUrl;
  return cleanedSettings;
};

export const buildInitialSettings = (
  savedSettings: PersistedSettings | null = null,
  glossaryFromDb: GlossaryTerm[] = [],
): TranslationSettings => {
  const cleanedSettings = stripDeprecatedSettings(savedSettings ?? {});

  if (cleanedSettings.glossaryExtractionInstructions === DEFAULT_GLOSSARY_EXTRACTION_INSTRUCTIONS) {
    cleanedSettings.glossaryExtractionInstructions = '';
  }

  const savedGlossary = Array.isArray(cleanedSettings.glossary)
    ? normalizeGlossaryTerms(cleanedSettings.glossary)
    : [];

  delete cleanedSettings.glossary;

  const parsedSettingsResult = TranslationSettingsSchema.partial().safeParse(cleanedSettings);
  const validatedSettings = parsedSettingsResult.success ? parsedSettingsResult.data : {};

  const resolvedLocalMtMode = validatedSettings.localMtMode ?? DEFAULT_TRANSLATION_SETTINGS.localMtMode;
  const resolvedLocalMtGlossaryProvider = validatedSettings.localMtGlossaryProvider ?? DEFAULT_TRANSLATION_SETTINGS.localMtGlossaryProvider;
  const resolvedLocalMtHybridTarget =
    resolvedLocalMtMode === 'hybrid' &&
    resolvedLocalMtGlossaryProvider === 'none' &&
    validatedSettings.localMtHybridTarget === 'client'
      ? 'server'
      : validatedSettings.localMtHybridTarget ?? DEFAULT_TRANSLATION_SETTINGS.localMtHybridTarget;

  return {
    ...DEFAULT_TRANSLATION_SETTINGS,
    ...validatedSettings,
    aiProvider: validatedSettings.aiProvider ?? DEFAULT_TRANSLATION_SETTINGS.aiProvider,
    geminiApiKey: validatedSettings.geminiApiKey ?? DEFAULT_TRANSLATION_SETTINGS.geminiApiKey,
    openaiApiKey: validatedSettings.openaiApiKey ?? DEFAULT_TRANSLATION_SETTINGS.openaiApiKey,
    openaiApiEndpoint: validatedSettings.openaiApiEndpoint || DEFAULT_OPENAI_ENDPOINT,
    deepseekApiKey: validatedSettings.deepseekApiKey ?? DEFAULT_TRANSLATION_SETTINGS.deepseekApiKey,
    deepseekApiEndpoint: validatedSettings.deepseekApiEndpoint || DEFAULT_DEEPSEEK_ENDPOINT,
    localMtEndpoint: validatedSettings.localMtEndpoint || DEFAULT_LOCAL_MT_ENDPOINT,
    localMtMode: resolvedLocalMtMode,
    localMtHybridTarget: resolvedLocalMtHybridTarget,
    localMtGlossaryProvider: resolvedLocalMtGlossaryProvider,
    glossary: glossaryFromDb.length > 0 ? glossaryFromDb : savedGlossary,
    useGlossaryAI: validatedSettings.useGlossaryAI ?? DEFAULT_TRANSLATION_SETTINGS.useGlossaryAI,
    defaultMatchType: validatedSettings.defaultMatchType ?? DEFAULT_TRANSLATION_SETTINGS.defaultMatchType,
    customInstructions: validatedSettings.customInstructions ?? DEFAULT_TRANSLATION_SETTINGS.customInstructions,
    glossaryExtractionInstructions: validatedSettings.glossaryExtractionInstructions ?? DEFAULT_TRANSLATION_SETTINGS.glossaryExtractionInstructions,
    exclusionList: validatedSettings.exclusionList ?? DEFAULT_TRANSLATION_SETTINGS.exclusionList,
  };
};

export const useSettings = () => {
  const [settings, setSettings] = useState<TranslationSettings>(DEFAULT_TRANSLATION_SETTINGS);
  const [editingTermInGlossaryViewId, setEditingTermInGlossaryViewId] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        let savedSettings: PersistedSettings | null = null;
        const settingsStr = localStorage.getItem('ai-novel-weaver-settings');

        if (settingsStr) {
          savedSettings = JSON.parse(settingsStr) as PersistedSettings;
        }

        let idbGlossary = await persistenceService.loadGlossary('global');

        if (
          savedSettings?.glossary &&
          savedSettings.glossary.length > 0 &&
          idbGlossary.length === 0
        ) {
          idbGlossary = normalizeGlossaryTerms(savedSettings.glossary);
          await persistenceService.saveGlossary('global', idbGlossary);
        }

        setSettings(buildInitialSettings(savedSettings, idbGlossary));
      } catch (error) {
        console.error('Failed to load settings from localStorage/IDB', error);
      }
    };

    loadSettingsData();
  }, []);

  const handleSettingsChange = (updater: React.SetStateAction<TranslationSettings>) => {
    setSettings((prevSettings: TranslationSettings) => {
      const newSettings = typeof updater === 'function' ? updater(prevSettings) : updater;

      try {
        const { glossary, ...settingsWithoutGlossary } = newSettings;
        localStorage.setItem('ai-novel-weaver-settings', JSON.stringify(settingsWithoutGlossary));
        persistenceService.saveGlossary('global', glossary).catch((error) => console.error(error));
      } catch (error) {
        console.error('Failed to save settings', error);
      }

      return newSettings;
    });
  };

  const handleGlossaryTermUpdate = (updatedTerm: GlossaryTerm) => {
    handleSettingsChange((prev: TranslationSettings) => ({
      ...prev,
      glossary: prev.glossary.map((term: GlossaryTerm) => (term.id === updatedTerm.id ? updatedTerm : term)),
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
