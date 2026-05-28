
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { GlossaryTerm, TranslationSettings } from '../types';

interface UseModalsProps {
  activeChapterId: string | null;
  handleChapterChange: (chapterId: string, updates: Partial<{ sourceText: string, translatedText: string }>) => void;
}

export const useModals = ({ activeChapterId, handleChapterChange }: UseModalsProps) => {
  const [isBatchTranslateOpen, setIsBatchTranslateOpen] = useState(false);
  const [isBatchExtractOpen, setIsBatchExtractOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportFilesModalOpen, setIsImportFilesModalOpen] = useState(false);
  const [isGlossaryViewOpen, setIsGlossaryViewOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [findReplaceState, setFindReplaceState] = useState<{ side: 'source' | 'target'; text: string } | null>(null);

  const handleFindReplace = (newText: string) => {
    if (!findReplaceState || !activeChapterId) return;
    const updateKey = findReplaceState.side === 'source' ? 'sourceText' : 'translatedText';
    handleChapterChange(activeChapterId, { [updateKey]: newText });
    setFindReplaceState(null);
  };

  return {
    isBatchTranslateOpen,
    setIsBatchTranslateOpen,
    isBatchExtractOpen,
    setIsBatchExtractOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isImportFilesModalOpen,
    setIsImportFilesModalOpen,
    isGlossaryViewOpen,
    setIsGlossaryViewOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    findReplaceState,
    setFindReplaceState,
    handleFindReplace,
  };
};
