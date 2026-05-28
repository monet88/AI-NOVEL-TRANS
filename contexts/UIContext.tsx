import React, { createContext, useContext, ReactNode } from 'react';
import { useModals } from '../hooks/useModals';
import { useLogs } from '../hooks/useLogs';
import { useProjectContext } from './ProjectContext';

interface UIContextType extends ReturnType<typeof useLogs> {
  // Modal states from useModals (except glossaryReviewState)
  isBatchTranslateOpen: boolean;
  setIsBatchTranslateOpen: (isOpen: boolean) => void;
  isBatchExtractOpen: boolean;
  setIsBatchExtractOpen: (isOpen: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (isOpen: boolean) => void;
  isImportFilesModalOpen: boolean;
  setIsImportFilesModalOpen: (isOpen: boolean) => void;
  isGlossaryViewOpen: boolean;
  setIsGlossaryViewOpen: (isOpen: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (isOpen: boolean) => void;
  activeHighlightIndex: number | null;
  setActiveHighlightIndex: (index: number | null) => void;
  findReplaceState: { side: 'source' | 'target'; text: string } | null;
  setFindReplaceState: (state: { side: 'source' | 'target'; text: string } | null) => void;
  handleFindReplace: (newText: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { activeChapterId, handleChapterChange } = useProjectContext();
  
  const modalsData = useModals({
      activeChapterId,
      handleChapterChange
  });

  const logsData = useLogs();
  const [activeHighlightIndex, setActiveHighlightIndex] = React.useState<number | null>(null);

  const value: UIContextType = {
    ...logsData,
    isBatchTranslateOpen: modalsData.isBatchTranslateOpen,
    setIsBatchTranslateOpen: modalsData.setIsBatchTranslateOpen,
    isBatchExtractOpen: modalsData.isBatchExtractOpen,
    setIsBatchExtractOpen: modalsData.setIsBatchExtractOpen,
    isSettingsModalOpen: modalsData.isSettingsModalOpen,
    setIsSettingsModalOpen: modalsData.setIsSettingsModalOpen,
    isImportFilesModalOpen: modalsData.isImportFilesModalOpen,
    setIsImportFilesModalOpen: modalsData.setIsImportFilesModalOpen,
    isGlossaryViewOpen: modalsData.isGlossaryViewOpen,
    setIsGlossaryViewOpen: modalsData.setIsGlossaryViewOpen,
    isExportModalOpen: modalsData.isExportModalOpen,
    setIsExportModalOpen: modalsData.setIsExportModalOpen,
    activeHighlightIndex,
    setActiveHighlightIndex,
    findReplaceState: modalsData.findReplaceState,
    setFindReplaceState: modalsData.setFindReplaceState,
    handleFindReplace: modalsData.handleFindReplace,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUIContext must be used within UIProvider');
  return context;
};
