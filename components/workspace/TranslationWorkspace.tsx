
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { GlossaryTerm } from '../../types';
import { LANGUAGES } from '../../constants';
import { testLocalMTConnection, testLocalMTFallbackProviderConnection, translateTextStream, extractGlossaryTerms } from '../../services/aiService';
import { generateGlossaryUsageReport } from '../../services/utils';
import ArrowsRightLeftIcon from '../icons/ArrowsRightLeftIcon';
import SettingsDropdown from '../layout/SettingsDropdown';
import DocumentDuplicateIcon from '../icons/DocumentDuplicateIcon';
import MagnifyingGlassIcon from '../icons/MagnifyingGlassIcon';
import ArrowsPointingOutIcon from '../icons/ArrowsPointingOutIcon';
import ArrowsPointingInIcon from '../icons/ArrowsPointingInIcon';
import GlossaryTermPopover from '../glossary/GlossaryTermPopover';
import PencilIcon from '../icons/PencilIcon';
import GlossaryTermTooltip from '../glossary/GlossaryTermTooltip';
import { useProjectContext, useUIContext, useGlossaryContext } from '../../contexts';
import TranslationLogPanel from './TranslationLogPanel';
import CommandLineIcon from '../icons/CommandLineIcon';
import EllipsisVerticalIcon from '../icons/EllipsisVerticalIcon';
import XMarkIcon from '../icons/XMarkIcon';
import { useTermHighlighter } from '../../hooks/useTermHighlighter';
import GlossaryUsageReport from '../glossary/GlossaryUsageReport';
import CheckCircleIcon from '../icons/CheckCircleIcon';

interface SyncableParagraphProps {
  text: string;
  index: number;
  isHighlighted: boolean;
  onMouseEnter: (index: number) => void;
  onMouseLeave: () => void;
  glossary: GlossaryTerm[];
  currentlyHighlightedTermId: string | null;
  setPopoverState: (state: { term: GlossaryTerm; anchorEl: HTMLElement } | null) => void;
  setTooltipState: (state: { term: GlossaryTerm; top: number; left: number; context: 'source' | 'target' } | null) => void;
  context: 'source' | 'target';
  sourceText?: string;
  translatedText?: string;
}

const SyncableParagraph: React.FC<SyncableParagraphProps> = ({
  text,
  index,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  glossary,
  currentlyHighlightedTermId,
  setPopoverState,
  setTooltipState,
  context,
  sourceText,
  translatedText
}) => {
  const highlightedText = useTermHighlighter(
    text,
    glossary,
    context === 'source' ? 'input' : 'translation',
    currentlyHighlightedTermId,
    setPopoverState,
    setTooltipState,
    context,
    sourceText,
    translatedText
  );

  return (
    <div 
      className={`px-4 py-3 my-1 transition-all duration-200 border-l-4 rounded-r-lg ${isHighlighted ? 'bg-accent-primary/10 border-accent-secondary shadow-sm text-text-primary' : 'hover:bg-dark-hover/30 border-transparent text-text-secondary'}`}
      onMouseEnter={() => onMouseEnter(index)}
      onMouseLeave={onMouseLeave}
    >
      {text.trim() === '' ? <br /> : highlightedText}
    </div>
  );
};

const TranslationWorkspace: React.FC = () => {
  const {
    activeProject,
    activeChapter,
    handleChapterChange,
  } = useProjectContext();

  const {
    settings,
    handleGlossaryTermUpdate,
    handleAddReviewedTerms,
    handleStartGlossaryReview,
    editingTermInGlossaryViewId,
  } = useGlossaryContext();

  const {
    setIsBatchTranslateOpen,
    setIsBatchExtractOpen,
    setFindReplaceState,
    setIsSettingsModalOpen,
    logs,
    addLog,
    clearLogs,
    setIsGlossaryViewOpen,
    setIsExportModalOpen,
    activeHighlightIndex,
    setActiveHighlightIndex,
  } = useUIContext();

  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('vi');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'source-only' | 'target-only'>('side-by-side');
  const [isSourceEditing, setIsSourceEditing] = useState(false);
  const [isTargetEditing, setIsTargetEditing] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);

  const [popoverState, setPopoverState] = useState<{ term: GlossaryTerm; anchorEl: HTMLElement } | null>(null);
  const [tooltipState, setTooltipState] = useState<{ term: GlossaryTerm; top: number; left: number; context: 'source' | 'target' } | null>(null);
  const [translationTime, setTranslationTime] = useState<number | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [showGlossaryReport, setShowGlossaryReport] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (showGlossaryReport) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setShowGlossaryReport(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showGlossaryReport]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
            setIsActionsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setSourceText(activeChapter?.sourceText ?? '');
    setTranslatedText(activeChapter?.translatedText ?? '');
  }, [activeChapter]);

  useEffect(() => {
    setIsSourceEditing(false);
    setIsTargetEditing(false);
    setTranslationTime(null);
  }, [activeChapter?.id]);

  const handleSourceTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceText(e.target.value);
    if (activeChapter) {
      handleChapterChange(activeChapter.id, { sourceText: e.target.value });
    }
  };

  const handleTranslatedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranslatedText(e.target.value);
    if (activeChapter) {
      handleChapterChange(activeChapter.id, { translatedText: e.target.value });
    }
  };

  const runTranslationWorkflow = useCallback(async () => {
    if (!activeChapter) return;
    addLog(`[${activeChapter.name}] Starting translation workflow...`);
    
    const { aiProvider, openaiApiKey, deepseekApiKey } = settingsRef.current;
    if ((aiProvider === 'openai' && !openaiApiKey) || (aiProvider === 'deepseek' && !deepseekApiKey)) {
        const providerName = aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1);
        const errorMsg = `${providerName} API key is missing. Please add it in the AI Settings.`;
        addLog(`ERROR: ${errorMsg}`);
        alert(errorMsg);
        return;
    }

    if (aiProvider === 'local-mt') {
        const fallbackProvider = settingsRef.current.localMtGlossaryProvider;
        if (
            settingsRef.current.localMtMode === 'hybrid' &&
            settingsRef.current.localMtHybridTarget === 'client' &&
            fallbackProvider === 'none'
        ) {
            const errorMsg = 'Client-side hybrid Local MT requires a fallback LLM provider. Configure one in AI Settings and try again.';
            addLog(`ERROR: ${errorMsg}`);
            alert(errorMsg);
            return;
        }

        if (fallbackProvider !== 'none') {
            const fallbackHealth = await testLocalMTFallbackProviderConnection(settingsRef.current);
            if (!fallbackHealth.success) {
                const errorMsg = `${fallbackHealth.message} Configure the fallback provider in AI Settings and try again.`;
                addLog(`ERROR: ${errorMsg}`);
                alert(errorMsg);
                return;
            }
        }

        const health = await testLocalMTConnection(settingsRef.current);
        if (!health.success) {
            const errorMsg = `${health.message} Start the local MT server at ${settingsRef.current.localMtEndpoint} and try again.`;
            addLog(`ERROR: ${errorMsg}`);
            alert(errorMsg);
            return;
        }
    }

    setIsTranslating(true);
    setTranslatedText('');
    let finalTranslation = '';
    const startTime = Date.now();
    
    // Create a local, mutable copy of settings for this specific translation run.
    // This prevents race conditions where the main settings state hasn't updated yet.
    const runSettings = { ...settingsRef.current };

    try {
        const trimmedSource = sourceText.trim();
        if (!trimmedSource) {
             addLog(`[${activeChapter.name}] Source text is empty. Aborting.`);
             return;
        }

        const shouldExtractGlossary = runSettings.aiProvider !== 'local-mt' || runSettings.localMtGlossaryProvider !== 'none';

        if (shouldExtractGlossary) {
            setTranslationProgress('Step 1/2: Analyzing for glossary terms...');
            addLog(`[${activeChapter.name}] Step 1: Extracting glossary terms...`);
            const extracted = await extractGlossaryTerms(
                trimmedSource,
                targetLang,
                runSettings.glossaryExtractionInstructions,
                runSettings.exclusionList,
                runSettings
            );

            const existingInputs = new Set(runSettings.glossary.map(t => t.input.toLowerCase()));
            const newTerms = extracted.filter(term => !existingInputs.has(term.input.toLowerCase()));
            addLog(`[${activeChapter.name}] Found ${newTerms.length} new terms for review.`);

            if (newTerms.length > 0) {
                setTranslationProgress('Step 1/2: Please review suggested terms...');
                const termsToAdd = await handleStartGlossaryReview(newTerms);
                if (termsToAdd.length > 0) {
                  addLog(`[${activeChapter.name}] Added ${termsToAdd.length} new terms from review.`);
                  // This updates the global settings state for future runs.
                  handleAddReviewedTerms(termsToAdd);

                  // FIX: Immediately update the local settings for the *current* translation run.
                  const termsToAddWithTempIds: GlossaryTerm[] = termsToAdd.map(t => ({...t, id: `temp-${t.input}-${Math.random()}`}));
                  runSettings.glossary = [...runSettings.glossary, ...termsToAddWithTempIds];
                } else {
                  addLog(`[${activeChapter.name}] No terms added from review.`);
                }
            }
        } else {
            setTranslationProgress('Step 1/2: Skipping glossary extraction for offline local MT...');
            addLog(`[${activeChapter.name}] Step 1: Glossary extraction skipped for pure offline local MT.`);
        }

        setTranslationProgress('Step 2/2: Translating text...');
        addLog(`[${activeChapter.name}] Step 2: Translating text via streaming...`);
        const onChunk = (chunk: string) => {
            if (!chunk.startsWith('[STREAM_TRANSLATION_ERROR')) {
                 setTranslatedText(prev => prev + chunk);
            } else {
                 setTranslatedText(chunk);
            }
        };

        let translated = await translateTextStream(trimmedSource, sourceLang, targetLang, runSettings, onChunk);
        
        if (translated.startsWith('[STREAM_TRANSLATION_ERROR')) {
            throw new Error(translated);
        }

        finalTranslation = translated;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Translation workflow failed:', error);
        addLog(`[${activeChapter.name}] WORKFLOW FAILED: ${errorMessage}`);
        finalTranslation = `[WORKFLOW_ERROR: ${errorMessage}]`;
        setTranslatedText(finalTranslation);
    } finally {
        if (finalTranslation && activeChapter) {
            handleChapterChange(activeChapter.id, { translatedText: finalTranslation });
            
            // Generate glossary usage report using the settings for this run
            const usageReport = generateGlossaryUsageReport(sourceText, finalTranslation, runSettings.glossary);
            addLog(`[${activeChapter.name}] ${usageReport}`);
        }
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        setTranslationTime(duration * 1000);
        addLog(`[${activeChapter.name}] Translation workflow completed in ${duration.toFixed(2)}s.`);
        setIsTranslating(false);
        setTranslationProgress(null);
        setIsTargetEditing(false);
    }
  }, [activeChapter, sourceText, targetLang, handleChapterChange, handleStartGlossaryReview, handleAddReviewedTerms, addLog, sourceLang]);


  const handleTranslate = async () => {
    if (!activeChapter || !sourceText.trim()) return;
    setTranslationTime(null);
    await runTranslationWorkflow();
  };
  
  const handleCheckGlossaryUsage = () => {
    if (!activeChapter || !sourceText.trim() || !translatedText.trim()) return;
    
    const usageReport = generateGlossaryUsageReport(sourceText, translatedText, settings.glossary);
    addLog(`[${activeChapter.name}] Manual Glossary Check:\n${usageReport}`);
    setShowGlossaryReport(true);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const currentlyHighlightedTermId = popoverState?.term.id ?? editingTermInGlossaryViewId;
  
  const sourceParagraphs = useMemo(() => sourceText.split('\n'), [sourceText]);
  const translatedParagraphs = useMemo(() => translatedText.split('\n'), [translatedText]);
  
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  if (!activeChapter || !activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-bg text-text-secondary">
        Select a chapter to begin editing.
      </div>
    );
  }

  const renderToolbar = (side: 'source' | 'target') => (
     <div className="flex justify-between items-center px-4 py-3 border-b border-border-color/30 bg-dark-panel">
        <div className="flex items-center space-x-2">
            <select
                value={side === 'source' ? sourceLang : targetLang}
                onChange={e => side === 'source' ? setSourceLang(e.target.value) : setTargetLang(e.target.value)}
                className="bg-dark-input border border-border-color rounded-md px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
        </div>
        <div className="flex items-center space-x-2">
            {side === 'target' && (
                <>
                    <button
                        onClick={handleCheckGlossaryUsage}
                        disabled={!sourceText.trim() || !translatedText.trim()}
                        className="p-2 rounded-md hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transform transition-transform hover:scale-110"
                        title="Check Glossary Usage"
                    >
                        <CheckCircleIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                </>
            )}
            {side === 'source' && (
                <button onClick={() => setIsSourceEditing(p => !p)} className={`p-2 rounded-md ${isSourceEditing ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'} transform transition-transform hover:scale-110`} title="Edit source text">
                    <PencilIcon className={`w-5 h-5 ${isSourceEditing ? 'text-white' : 'text-text-secondary'}`}/>
                </button>
            )}
            {side === 'target' && (
               <button onClick={() => setIsTargetEditing(p => !p)} className={`p-2 rounded-md ${isTargetEditing ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover'} transform transition-transform hover:scale-110`} title="Edit translated text">
                    <PencilIcon className={`w-5 h-5 ${isTargetEditing ? 'text-white' : 'text-text-secondary'}`}/>
                </button>
            )}
            <button onClick={() => setFindReplaceState({ side, text: side === 'source' ? activeChapter?.sourceText ?? '' : activeChapter?.translatedText ?? '' })} className="p-2 rounded-md hover:bg-dark-hover transform transition-transform hover:scale-110" title="Find & Replace">
              <MagnifyingGlassIcon className="w-5 h-5 text-text-secondary"/>
            </button>
            <button onClick={() => handleCopyToClipboard(side === 'source' ? sourceText : translatedText)} className="p-2 rounded-md hover:bg-dark-hover transform transition-transform hover:scale-110" title="Copy to clipboard">
                <DocumentDuplicateIcon className="w-5 h-5 text-text-secondary" />
            </button>
        </div>
    </div>
  );

  return (
    <main className="flex-1 flex flex-col bg-dark-bg overflow-hidden">
      <div className="flex-shrink-0 flex justify-between items-center px-6 py-3 border-b border-border-color/30 bg-dark-panel shadow-sm">
        <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-text-primary truncate pr-4">{activeProject.name} / {activeChapter.name}</h2>
            <div className="flex items-center space-x-1 flex-wrap">
                <button onClick={() => setViewMode('side-by-side')} className={`p-1.5 rounded-md ${viewMode === 'side-by-side' ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover text-text-secondary transition-transform hover:scale-110'}`} title="Side-by-side view">
                    <ArrowsRightLeftIcon className="w-5 h-5"/>
                </button>
                 <button onClick={() => setViewMode('source-only')} className={`p-1.5 rounded-md ${viewMode === 'source-only' ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover text-text-secondary transition-transform hover:scale-110'}`} title="Source only view">
                    <ArrowsPointingInIcon className="w-5 h-5" style={{transform: 'rotate(-45deg)'}}/>
                </button>
                 <button onClick={() => setViewMode('target-only')} className={`p-1.5 rounded-md ${viewMode === 'target-only' ? 'bg-accent-primary text-white' : 'hover:bg-dark-hover text-text-secondary transition-transform hover:scale-110'}`} title="Target only view">
                    <ArrowsPointingOutIcon className="w-5 h-5" style={{transform: 'rotate(-45deg)'}}/>
                </button>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-2">
                <button onClick={() => setIsExportModalOpen(true)} className="px-3 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary transform transition-transform hover:-translate-y-px">
                    <span>Export</span>
                </button>
                <button onClick={() => setIsGlossaryViewOpen(true)} className="px-3 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary transform transition-transform hover:-translate-y-px">
                    <span>Manage Glossary</span>
                </button>
                <button onClick={() => setIsBatchExtractOpen(true)} className="px-3 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary transform transition-transform hover:-translate-y-px">
                    <span>Extract Glossary</span>
                </button>
                <button onClick={() => setIsBatchTranslateOpen(true)} className="px-3 py-1.5 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary transform transition-transform hover:-translate-y-px">
                    <span>Batch Translate</span>
                </button>
                <SettingsDropdown />
            </div>

            <div className="md:hidden relative" ref={actionsMenuRef}>
                <button onClick={() => setIsActionsMenuOpen(p => !p)} className="p-2 rounded-md hover:bg-dark-hover transform transition-transform hover:scale-110">
                    <EllipsisVerticalIcon className="w-5 h-5 text-text-secondary" />
                </button>
                {isActionsMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-dark-panel rounded-md shadow-lg z-20 border border-border-color animate-fade-in">
                        <button onClick={() => { setIsExportModalOpen(true); setIsActionsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-dark-hover">Export Project</button>
                        <button onClick={() => { setIsGlossaryViewOpen(true); setIsActionsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-dark-hover">Manage Glossary</button>
                        <button onClick={() => { setIsBatchExtractOpen(true); setIsActionsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-dark-hover">Extract Glossary</button>
                        <button onClick={() => { setIsBatchTranslateOpen(true); setIsActionsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-dark-hover">Batch Translate</button>
                        <div className="border-t border-border-color my-1"></div>
                        <button onClick={() => { setIsSettingsModalOpen(true); setIsActionsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-dark-hover">AI Settings</button>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 md:p-6 bg-dark-bg overflow-hidden">
        <div className={`flex flex-col bg-dark-panel rounded-xl shadow-sm border border-border-color/50 overflow-hidden min-h-0 ${viewMode === 'target-only' ? 'hidden' : ''} ${viewMode !== 'side-by-side' ? 'col-span-2' : ''}`}>
          {renderToolbar('source')}
          <div className="relative flex-1 min-h-0">
            {isSourceEditing ? (
                <textarea
                  value={sourceText}
                  onChange={handleSourceTextChange}
                  className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-text-primary leading-relaxed"
                  placeholder="Enter source text..."
                  autoFocus
                  aria-label="Source text"
                />
            ) : (
                <div className="w-full h-full p-4 text-text-primary leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar">
                    {sourceParagraphs.map((para, idx) => (
                      <SyncableParagraph
                        key={idx}
                        index={idx}
                        text={para}
                        isHighlighted={activeHighlightIndex === idx}
                        onMouseEnter={(i) => setActiveHighlightIndex(i)}
                        onMouseLeave={() => setActiveHighlightIndex(null)}
                        glossary={settings.glossary}
                        currentlyHighlightedTermId={currentlyHighlightedTermId}
                        setPopoverState={setPopoverState}
                        setTooltipState={setTooltipState}
                        context="source"
                        sourceText={sourceText}
                        translatedText={translatedText}
                      />
                    ))}
                </div>
            )}
          </div>
           <div className="flex-shrink-0 px-4 py-1 border-t border-border-color bg-dark-sidebar text-right">
                <span className="text-xs text-text-secondary">Words: {countWords(sourceText)}</span>
            </div>
        </div>

        <div className={`flex flex-col bg-dark-panel rounded-xl shadow-sm border border-border-color/50 overflow-hidden min-h-0 ${viewMode === 'source-only' ? 'hidden' : ''} ${viewMode !== 'side-by-side' ? 'col-span-2' : ''}`}>
           {renderToolbar('target')}
           <div className="relative flex-1 min-h-0">
            {isTargetEditing ? (
              <textarea
                value={translatedText}
                onChange={handleTranslatedTextChange}
                className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-text-primary leading-relaxed"
                placeholder="Translation will appear here..."
                autoFocus={isTargetEditing}
                aria-label="Translated text"
              />
            ) : (
              <div
                className="w-full h-full p-4 text-text-primary leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar"
              >
                 {isTranslating && !translatedText ? (
                    <span className="text-text-secondary animate-pulse">Waiting for translation stream...</span>
                ) : translatedText ? (
                    translatedParagraphs.map((para, idx) => (
                      <SyncableParagraph
                        key={idx}
                        index={idx}
                        text={para}
                        isHighlighted={activeHighlightIndex === idx}
                        onMouseEnter={(i) => setActiveHighlightIndex(i)}
                        onMouseLeave={() => setActiveHighlightIndex(null)}
                        glossary={settings.glossary}
                        currentlyHighlightedTermId={currentlyHighlightedTermId}
                        setPopoverState={setPopoverState}
                        setTooltipState={setTooltipState}
                        context="target"
                        sourceText={sourceText}
                        translatedText={translatedText}
                      />
                    ))
                ) : (
                    <span className="text-text-secondary">Translation will appear here...</span>
                )}
              </div>
            )}
          </div>
            <div className="flex-shrink-0 px-4 py-1 border-t border-border-color bg-dark-sidebar text-right">
                <span className="text-xs text-text-secondary">Words: {countWords(translatedText)}</span>
            </div>
        </div>
      </div>
      
      {isLogPanelOpen && <TranslationLogPanel logs={logs} onClear={clearLogs} />}

      <div className="relative flex-shrink-0 p-4 border-t border-border-color/30 bg-dark-panel flex flex-col justify-center items-center space-y-2 min-h-[80px]">
        <div className="text-sm text-center text-text-secondary h-5" aria-live="polite">
            {isTranslating && translationProgress ? (
                <span className="animate-fade-in">{translationProgress}</span>
            ) : !isTranslating && translationTime !== null ? (
                <span className="animate-fade-in">Last translation completed in {(translationTime / 1000).toFixed(2)}s</span>
            ) : (
                <span>&nbsp;</span>
            )}
        </div>
        <button
          onClick={handleTranslate}
          disabled={isTranslating || !sourceText}
          className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-8 rounded-lg flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-px transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
        >
          {isTranslating && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{isTranslating ? 'Processing...' : 'Translate'}</span>
        </button>
        <div className="absolute bottom-2 right-2">
            <button
              onClick={() => setIsLogPanelOpen(p => !p)}
              className={`p-2 rounded-md ${isLogPanelOpen ? 'bg-accent-secondary/30 text-accent-secondary' : 'hover:bg-dark-hover text-text-secondary'} transform transition-transform hover:scale-110`}
              title={isLogPanelOpen ? "Hide Log" : "Show Log"}
            >
                <CommandLineIcon className="w-5 h-5"/>
            </button>
        </div>
      </div>

      {popoverState && (
        <GlossaryTermPopover
          term={popoverState.term}
          anchorEl={popoverState.anchorEl}
          onSave={(updatedTerm) => {
            handleGlossaryTermUpdate(updatedTerm);
            setPopoverState(null);
          }}
          onClose={() => setPopoverState(null)}
        />
      )}

      {tooltipState && (
        <GlossaryTermTooltip
            term={tooltipState.term}
            top={tooltipState.top}
            left={tooltipState.left}
            context={tooltipState.context}
        />
      )}

      {showGlossaryReport && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-panel rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="glossary-usage-report-title">
            <div className="p-4 border-b border-border-color flex justify-between items-center">
              <h2 id="glossary-usage-report-title" className="text-xl font-bold text-text-primary">Glossary Usage Report</h2>
              <button
                onClick={() => setShowGlossaryReport(false)}
                className="p-2 rounded-md hover:bg-dark-hover text-text-secondary"
                aria-label="Close glossary usage report"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <GlossaryUsageReport
                sourceText={sourceText}
                translatedText={translatedText}
                glossary={settings.glossary}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default TranslationWorkspace;
