
import React, { useState, useEffect, useRef } from 'react';
import type { GlossaryTerm } from '../../types';
import XMarkIcon from '../icons/XMarkIcon';
import { useProjectContext, useUIContext, useGlossaryContext } from '../../contexts';
import { testLocalMTFallbackProviderConnection } from '../../services/aiService';
import { BatchOrchestrator, BatchChapter, ChapterStatus, BatchProcessState } from '../../services/batchOrchestrator';
import BatchChapterRow from '../workspace/BatchChapterRow';
import InteractiveGlossaryApproval from '../workspace/InteractiveGlossaryApproval';

const BatchExtractModal: React.FC = () => {
  const { activeProject: project } = useProjectContext();
  const { settings, handleAddReviewedTerms } = useGlossaryContext();
  const { setIsBatchExtractOpen, addLog } = useUIContext();
  
  const orchestratorRef = useRef<BatchOrchestrator | null>(null);
  const [batchState, setBatchState] = useState<BatchProcessState | null>(null);
  const [initialChapters, setInitialChapters] = useState<BatchChapter[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());
  
  const [reviewTerms, setReviewTerms] = useState<Omit<GlossaryTerm, 'id'>[] | null>(null);

  const onExtractionComplete = (extractedTerms: Omit<GlossaryTerm, 'id'>[]) => {
    const uniqueTerms = Array.from(new Map(extractedTerms.map(item => [item.input.toLowerCase(), item])).values());
    const existingInputs = new Set(settings.glossary.map(t => t.input.toLowerCase()));
    const newTerms = uniqueTerms.filter(term => !existingInputs.has(term.input.toLowerCase()));

    if (newTerms.length > 0) {
      setReviewTerms(newTerms);
    } else {
      alert("No new terms were extracted from the selected chapters.");
      setIsBatchExtractOpen(false);
    }
  };

  const handleApplyReview = (approvedTerms: Omit<GlossaryTerm, 'id'>[]) => {
    handleAddReviewedTerms(approvedTerms);
    setIsBatchExtractOpen(false);
  };
  
  const onClose = () => {
    if (!batchState?.running) {
      setIsBatchExtractOpen(false);
    }
  }

  useEffect(() => {
    if (!project) return;
    const allChapters = project.chapters.map(c => ({ ...c, status: ChapterStatus.Pending }));
    setInitialChapters(allChapters);
    setSelectedChapterIds(new Set(allChapters.filter(c => c.sourceText.trim()).map(c => c.id)));
  }, [project]);

  const handleToggleSelection = (chapterId: string) => {
    setSelectedChapterIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => setSelectedChapterIds(new Set(initialChapters.map(c => c.id)));
  const handleDeselectAll = () => setSelectedChapterIds(new Set());

  const handleStartBatchExtract = async () => {
    if (!project) return;
    const { aiProvider, openaiApiKey, deepseekApiKey, localMtGlossaryProvider } = settings;

    if (aiProvider === 'local-mt') {
        if (localMtGlossaryProvider === 'none') {
            alert('Local MT offline mode cannot extract glossary terms without a fallback LLM provider. Choose Gemini, OpenAI, or DeepSeek in AI Settings.');
            return;
        }

        const fallbackHealth = await testLocalMTFallbackProviderConnection(settings);
        if (!fallbackHealth.success) {
            alert(`${fallbackHealth.message} Configure the fallback provider in AI Settings and try again.`);
            return;
        }
    }

    if ((aiProvider === 'openai' && !openaiApiKey) || (aiProvider === 'deepseek' && !deepseekApiKey)) {
        const providerName = aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1);
        alert(`${providerName} API key is missing. Please add it in the AI Settings before starting a batch job.`);
        return;
    }

    const chaptersToProcess = project.chapters.filter(c => selectedChapterIds.has(c.id));
    
    const orchestrator = new BatchOrchestrator({
        projectId: project.id,
        chapters: chaptersToProcess,
        settings: JSON.parse(JSON.stringify(settings)),
        targetLang: 'vi',
        addLog,
    });
    orchestratorRef.current = orchestrator;

    orchestrator.on<BatchProcessState>('stateUpdate', setBatchState);
    orchestrator.on<Omit<GlossaryTerm, 'id'>[]>('extractionDone', onExtractionComplete);
    
    orchestrator.startExtractionOnly();
  };

  if (!project) return null;

  const chaptersForDisplay = batchState?.chapters ?? initialChapters;
  const isExtracting = batchState?.running ?? false;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-panel rounded-xl shadow-2xl w-full h-full sm:max-w-2xl sm:h-[70vh] flex flex-col" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="batch-extract-title">
        <header className="p-4 border-b border-border-color flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <h2 id="batch-extract-title" className="text-lg font-bold">Batch Extract Glossary Terms</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-hover" disabled={isExtracting} aria-label="Close batch extract">
            <XMarkIcon className="w-6 h-6 text-text-secondary"/>
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-6">
          {reviewTerms ? (
            <InteractiveGlossaryApproval 
              terms={reviewTerms} 
              onComplete={handleApplyReview}
              onCancel={() => {
                setReviewTerms(null);
                setIsBatchExtractOpen(false);
              }}
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-text-secondary">
                  Select chapters to extract key terms from. Empty chapters will be skipped.
                </p>
                <div className="flex space-x-2">
                  <button onClick={handleSelectAll} disabled={isExtracting} className="text-xs font-semibold text-accent-primary hover:underline disabled:opacity-50">Select All</button>
                  <button onClick={handleDeselectAll} disabled={isExtracting} className="text-xs font-semibold text-accent-primary hover:underline disabled:opacity-50">Deselect All</button>
                </div>
              </div>
              {initialChapters.length > 0 ? (
                <ul className="space-y-2">
                  {chaptersForDisplay.map(chapter => (
                    <BatchChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        isSelected={selectedChapterIds.has(chapter.id)}
                        onToggleSelection={handleToggleSelection}
                        isInteractive={!isExtracting}
                        showCheckbox={true}
                    />
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10 text-text-secondary">
                  <p>This project has no chapters.</p>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="p-4 border-t border-border-color flex justify-end items-center flex-shrink-0 bg-dark-sidebar rounded-b-xl">
          {reviewTerms ? null : (
            <div className="flex items-center space-x-2">
              <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium bg-dark-hover text-text-primary hover:bg-dark-input" disabled={isExtracting}>
                Cancel
              </button>
              <button 
                onClick={handleStartBatchExtract} 
                disabled={isExtracting || selectedChapterIds.size === 0}
                className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? `Extracting... (${Math.round((batchState?.progress ?? 0) * 100)}%)` : `Extract from ${selectedChapterIds.size} Chapters`}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default BatchExtractModal;