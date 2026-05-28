
import React, { useState, useEffect, useRef } from 'react';
import XMarkIcon from '../icons/XMarkIcon';
import { useProjectContext, useUIContext, useGlossaryContext } from '../../contexts';
import { BatchOrchestrator, BatchChapter, ChapterStatus, BatchProcessState } from '../../services/batchOrchestrator';
import BatchChapterRow from '../workspace/BatchChapterRow';
import InteractiveGlossaryApproval from '../workspace/InteractiveGlossaryApproval';
import type { GlossaryTerm } from '../../types';

const BatchTranslateModal: React.FC = () => {
  const { 
    activeProject: project, 
    handleUpdateChapters,
    pendingResumeJob,
    clearPendingResumeJob,
  } = useProjectContext();
  
  const {
      settings,
      handleAddReviewedTerms,
      handleStartGlossaryReview,
  } = useGlossaryContext();

  const {
      setIsBatchTranslateOpen, 
      addLog,
  } = useUIContext();

  const [initialChapters, setInitialChapters] = useState<BatchChapter[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());
  const [batchState, setBatchState] = useState<BatchProcessState | null>(null);
  
  const [reviewTerms, setReviewTerms] = useState<Omit<GlossaryTerm, 'id'>[] | null>(null);
  const reviewResolveRef = useRef<((terms: Omit<GlossaryTerm, 'id'>[]) => void) | null>(null);

  const handleRequestInternalReview = (terms: Omit<GlossaryTerm, 'id'>[]) => {
    return new Promise<Omit<GlossaryTerm, 'id'>[]>(resolve => {
        setReviewTerms(terms);
        reviewResolveRef.current = resolve;
    });
  };

  const handleClearReview = (approvedTerms: Omit<GlossaryTerm, 'id'>[]) => {
    setReviewTerms(null);
    if (reviewResolveRef.current) {
        reviewResolveRef.current(approvedTerms);
        reviewResolveRef.current = null;
    }
  };
  const orchestratorRef = useRef<BatchOrchestrator | null>(null);
  
  const onClose = () => {
      if (!batchState?.running) {
        setIsBatchTranslateOpen(false);
      }
  };

  useEffect(() => {
    if (!project) return;
    const allChapters = project.chapters.map(c => ({ ...c, status: ChapterStatus.Pending }));
    setInitialChapters(allChapters);
    setSelectedChapterIds(new Set(allChapters.map(c => c.id)));
  }, [project]);

  useEffect(() => {
    if (pendingResumeJob && project && project.id === pendingResumeJob.projectId) {
        const orchestrator = new BatchOrchestrator({
            projectId: project.id,
            chapters: project.chapters,
            settings: JSON.parse(JSON.stringify(settings)),
            targetLang: 'vi',
            requestGlossaryReview: handleRequestInternalReview,
            onGlossaryUpdate: handleAddReviewedTerms,
            onChaptersUpdate: handleUpdateChapters,
            addLog,
        });
        orchestratorRef.current = orchestrator;
        orchestrator.on<BatchProcessState>('stateUpdate', (state) => setBatchState(state));
        orchestrator.start(pendingResumeJob.state);
        clearPendingResumeJob();
    }
  }, [pendingResumeJob, project, settings, handleStartGlossaryReview, handleAddReviewedTerms, handleUpdateChapters, clearPendingResumeJob, addLog]);


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

  const handleStartBatchTranslate = async () => {
    if (!project) return;
    const { aiProvider, openaiApiKey, deepseekApiKey } = settings;
    if ((aiProvider === 'openai' && !openaiApiKey) || (aiProvider === 'deepseek' && !deepseekApiKey)) {
        const providerName = aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1);
        alert(`${providerName} API key is missing. Please add it in the AI Settings.`);
        return;
    }

    const chaptersToProcess = project.chapters.filter(c => selectedChapterIds.has(c.id));
    if (chaptersToProcess.length === 0) return;
    
    const orchestrator = new BatchOrchestrator({
        projectId: project.id,
        chapters: chaptersToProcess,
        settings: JSON.parse(JSON.stringify(settings)),
        targetLang: 'vi',
        requestGlossaryReview: handleRequestInternalReview,
        onGlossaryUpdate: handleAddReviewedTerms,
        onChaptersUpdate: handleUpdateChapters,
        addLog,
    });
    orchestratorRef.current = orchestrator;

    orchestrator.on<BatchProcessState>('stateUpdate', (state) => {
        setBatchState(state);
    });

    orchestrator.start();
  };
  
  if (!project) return null;

  const chaptersForDisplay = batchState?.chapters ?? initialChapters;
  const running = batchState?.running ?? false;
  const phase = batchState?.phase ?? 'idle';
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-dark-panel rounded-xl shadow-2xl w-full h-full sm:max-w-2xl sm:h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-4 border-b border-border-color flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-bold">Batch Translate Chapters</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-hover" disabled={running}>
              <XMarkIcon className="w-6 h-6 text-text-secondary"/>
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-6">
            {reviewTerms ? (
              <InteractiveGlossaryApproval 
                terms={reviewTerms} 
                onComplete={handleClearReview}
                onCancel={() => {
                  setReviewTerms(null);
                  orchestratorRef.current?.stop(); // I might need to implement stop()
                  setIsBatchTranslateOpen(false);
                }}
              />
            ) : !running && phase === 'idle' ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-text-secondary">Select chapters to translate or re-translate.</p>
                  <div className="flex space-x-2">
                    <button onClick={handleSelectAll} className="text-xs font-semibold text-accent-primary hover:underline">Select All</button>
                    <button onClick={handleDeselectAll} className="text-xs font-semibold text-accent-primary hover:underline">Deselect All</button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {initialChapters.map(chapter => (
                    <BatchChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        isSelected={selectedChapterIds.has(chapter.id)}
                        onToggleSelection={handleToggleSelection}
                        isInteractive={true}
                        showCheckbox={true}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <div>
                <div className="text-center mb-4">
                    <p className="text-lg font-semibold text-text-primary capitalize">{batchState?.phase} Phase</p>
                    <p className="text-sm text-text-secondary">{batchState?.currentTask}</p>
                </div>
                <div className="w-full bg-dark-input rounded-full h-2.5 mb-4">
                    <div className="bg-accent-primary h-2.5 rounded-full" style={{ width: `${(batchState?.progress ?? 0) * 100}%` }}></div>
                </div>
                <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                    {chaptersForDisplay.map(chapter => (
                       <BatchChapterRow
                            key={chapter.id}
                            chapter={chapter}
                            isSelected={false} 
                            onToggleSelection={() => {}}
                            isInteractive={false}
                            showCheckbox={false}
                        />
                    ))}
                </ul>
              </div>
            )}
          </div>

          <footer className="p-4 border-t border-border-color flex justify-end items-center flex-shrink-0 bg-dark-sidebar rounded-b-xl">
            {reviewTerms ? null : phase === 'done' ? (
                 <button onClick={onClose} className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg">Done</button>
            ) : (
              <div className="flex items-center space-x-2">
                  <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium bg-dark-hover text-text-primary hover:bg-dark-input" disabled={running}>Cancel</button>
                  <button onClick={handleStartBatchTranslate} disabled={running || selectedChapterIds.size === 0} className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                      {running ? 'Processing...' : `Translate ${selectedChapterIds.size} Chapters`}
                  </button>
              </div>
            )}
          </footer>
        </div>
      </div>
    </>
  );
};

export default BatchTranslateModal;
