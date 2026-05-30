import React, { createContext, useContext, ReactNode } from 'react';
import type { TranslationSettings, GlossaryTerm } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useProjectContext } from './ProjectContext';

interface GlossaryContextType {
  settings: TranslationSettings;
  editingTermInGlossaryViewId: string | null;
  handleSettingsChange: (updater: React.SetStateAction<TranslationSettings>) => void;
  handleGlossaryTermUpdate: (updatedTerm: GlossaryTerm) => void;
  handleGlossaryBulkUpdate: (oldTranslation: string, newTranslation: string, matchType: GlossaryTerm['matchType']) => void;
  setEditingTermInGlossaryViewId: (id: string | null) => void;
  // Glossary Review State (Moved from useModals to GlossaryContext)
  glossaryReviewState: {
    terms: Omit<GlossaryTerm, 'id'>[];
    resolve: (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => void;
  } | null;
  handleStartGlossaryReview: (terms: Omit<GlossaryTerm, 'id'>[]) => Promise<Omit<GlossaryTerm, 'id'>[]>;
  handleGlossaryReviewClose: (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => void;
  handleAddReviewedTerms: (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => void;
}

const GlossaryContext = createContext<GlossaryContextType | undefined>(undefined);

export const GlossaryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, editingTermInGlossaryViewId, handleSettingsChange, handleGlossaryTermUpdate, setEditingTermInGlossaryViewId } = useSettings();
  
  const [glossaryReviewState, setGlossaryReviewState] = React.useState<{
    terms: Omit<GlossaryTerm, 'id'>[];
    resolve: (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => void;
  } | null>(null);

  const handleStartGlossaryReview = (terms: Omit<GlossaryTerm, 'id'>[]): Promise<Omit<GlossaryTerm, 'id'>[]> => {
    return new Promise((resolve) => {
      setGlossaryReviewState({ terms, resolve });
    });
  };

  const handleAddReviewedTerms = (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => {
      if (termsToAdd.length === 0) return;
      const newGlossaryTerms = termsToAdd.map(term => ({ ...term, id: crypto.randomUUID() }));
      handleSettingsChange(prev => ({ ...prev, glossary: [...prev.glossary, ...newGlossaryTerms] }));
  };

  const handleGlossaryReviewClose = (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => {
    glossaryReviewState?.resolve(termsToAdd);
    setGlossaryReviewState(null);
  };

  const { activeProject, handleUpdateChapters } = useProjectContext();

  const handleGlossaryBulkUpdate = (oldTranslation: string, newTranslation: string, matchType: GlossaryTerm['matchType']) => {
    if (!activeProject) return;
    const chaptersToUpdate = activeProject.chapters.map(chapter => {
        const flags = matchType === 'Case-Insensitive' ? 'gi' : 'g';
        const regex = new RegExp(`\\b${oldTranslation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
        const updatedTranslatedText = chapter.translatedText.replace(regex, newTranslation);
        return { ...chapter, translatedText: updatedTranslatedText };
    });
    handleUpdateChapters(chaptersToUpdate);
  };

  const value = {
    settings,
    editingTermInGlossaryViewId,
    handleSettingsChange,
    handleGlossaryTermUpdate,
    handleGlossaryBulkUpdate,
    setEditingTermInGlossaryViewId,
    glossaryReviewState,
    handleStartGlossaryReview,
    handleGlossaryReviewClose,
    handleAddReviewedTerms,
  };

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
};

export const useGlossaryContext = () => {
  const context = useContext(GlossaryContext);
  if (!context) throw new Error('useGlossaryContext must be used within GlossaryProvider');
  return context;
};
