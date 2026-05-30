
import React, { useRef } from 'react';
import { 
  Header, Sidebar, TranslationWorkspace, BatchTranslateModal, 
  GlossaryReviewModal, BatchExtractModal, FindReplaceModal, 
  ImportFromFilesModal, ProjectSelectionView, GlossaryView,
  ExportModal
} from './components';

import { AppProviders, useProjectContext, useUIContext, useGlossaryContext } from './contexts';

const AppContent: React.FC = () => {
  const {
    view,
    handleImportChaptersFromFiles,
    triggerImportProject,
    handleImportProject,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useProjectContext();

  const {
    glossaryReviewState,
    handleGlossaryReviewClose,
  } = useGlossaryContext();

  const {
    isBatchTranslateOpen,
    isBatchExtractOpen,
    findReplaceState,
    setFindReplaceState,
    handleFindReplace,
    isImportFilesModalOpen,
    setIsImportFilesModalOpen,
    isGlossaryViewOpen,
    setIsGlossaryViewOpen,
    isExportModalOpen,
    setIsExportModalOpen,
  } = useUIContext();

  const importProjectInputRef = useRef<HTMLInputElement>(null);

  // Effect to link the trigger function to the input click
  React.useEffect(() => {
    triggerImportProject.current = () => importProjectInputRef.current?.click();
  }, [triggerImportProject]);

  return (
    <div className="flex flex-col h-screen font-sans">
      <input
        type="file"
        ref={importProjectInputRef}
        onChange={handleImportProject}
        accept=".json"
        className="hidden"
        aria-label="Import project JSON file"
      />

      {view === 'dashboard' ? (
        <ProjectSelectionView />
      ) : (
        <>
          <Header />
          <div className="flex flex-1 overflow-hidden relative">
            {isSidebarOpen && (
              <div 
                onClick={() => setIsSidebarOpen(false)} 
                className="lg:hidden fixed inset-0 bg-black/60 z-20"
                aria-hidden="true"
              />
            )}
            <Sidebar />
            <TranslationWorkspace />
          </div>
        </>
      )}

      {isBatchTranslateOpen && <BatchTranslateModal />}
      {isBatchExtractOpen && <BatchExtractModal />}

      {isGlossaryViewOpen && (
        <GlossaryView onClose={() => setIsGlossaryViewOpen(false)} />
      )}

      {glossaryReviewState && (
        <GlossaryReviewModal
          extractedTerms={glossaryReviewState.terms}
          onComplete={handleGlossaryReviewClose}
        />
      )}
      
      {findReplaceState && (
        <FindReplaceModal 
            isOpen={!!findReplaceState}
            onClose={() => setFindReplaceState(null)}
            initialText={findReplaceState.text}
            onReplace={handleFindReplace}
        />
      )}
      
      {isImportFilesModalOpen && (
        <ImportFromFilesModal
            onClose={() => setIsImportFilesModalOpen(false)}
            onImport={handleImportChaptersFromFiles}
        />
      )}

      {isExportModalOpen && (
        <ExportModal onClose={() => setIsExportModalOpen(false)} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
};

export default App;
