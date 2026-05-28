
import type { Chapter, GlossaryTerm, TranslationSettings } from '../types';
import { extractGlossaryTerms, translateTextStream } from './aiService';
import { buildPromptTemplate } from './utils';

export enum ChapterStatus {
  Pending,
  InProgress,
  GlossaryReview,
  Translating,
  Completed,
  Failed,
}

export interface BatchChapter extends Chapter {
  status: ChapterStatus;
}

export type BatchProcessPhase = 'idle' | 'glossary' | 'translation' | 'done';

export interface BatchProcessState {
    running: boolean;
    phase: BatchProcessPhase;
    currentTask: string;
    chapters: BatchChapter[];
    progress: number; // 0 to 1
}

type EventListener<T> = (data: T) => void;

class EventEmitter {
    private listeners: { [event: string]: Function[] } = {};

    on<T>(event: string, listener: EventListener<T>) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
        return () => {
            if (this.listeners[event]) {
              this.listeners[event] = this.listeners[event].filter(l => l !== listener);
            }
        };
    }

    emit<T>(event: string, data?: T) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(data!));
        }
    }

    off(event: string) {
        delete this.listeners[event];
    }
}

interface BatchOrchestratorConstructor {
    projectId: string;
    chapters: Chapter[];
    settings: TranslationSettings;
    targetLang: string;
    requestGlossaryReview?: (terms: Omit<GlossaryTerm, 'id'>[]) => Promise<Omit<GlossaryTerm, 'id'>[]>;
    onGlossaryUpdate?: (terms: Omit<GlossaryTerm, 'id'>[]) => void;
    onChaptersUpdate?: (chapters: Chapter[]) => void;
    addLog?: (message: string) => void;
}

export class BatchOrchestrator extends EventEmitter {
    private projectId: string;
    private chaptersToProcess: Chapter[];
    private settings: TranslationSettings;
    private targetLang: string;
    private requestGlossaryReview: (terms: Omit<GlossaryTerm, 'id'>[]) => Promise<Omit<GlossaryTerm, 'id'>[]>;
    private onGlossaryUpdate: (terms: Omit<GlossaryTerm, 'id'>[]) => void;
    private onChaptersUpdate: (chapters: Chapter[]) => void;
    private addLog: (message: string) => void;
    private reviewedTermsCache: Set<string>;
    private state: BatchProcessState;
    private saveInterval: number | null = null;
    private isStopped: boolean = false;

    constructor({
        projectId,
        chapters,
        settings,
        targetLang,
        requestGlossaryReview,
        onGlossaryUpdate,
        onChaptersUpdate,
        addLog,
    }: BatchOrchestratorConstructor) {
        super();
        this.projectId = projectId;
        this.chaptersToProcess = chapters;
        this.settings = settings;
        this.targetLang = targetLang;
        this.requestGlossaryReview = requestGlossaryReview || (async () => []);
        this.onGlossaryUpdate = onGlossaryUpdate || (() => {});
        this.onChaptersUpdate = onChaptersUpdate || (() => {});
        this.addLog = addLog || (() => {});
        this.reviewedTermsCache = new Set(this.settings.glossary.map(t => t.input.toLowerCase()));
        this.state = {
            running: false,
            phase: 'idle',
            currentTask: '',
            chapters: this.chaptersToProcess.map(c => ({...c, status: ChapterStatus.Pending })),
            progress: 0,
        };
    }
    
    private _getStorageKey = () => `batch-progress-${this.projectId}`;

    private _saveState = () => {
        if (!this.state.running) return;
        localStorage.setItem(this._getStorageKey(), JSON.stringify(this.state));
    };

    private _clearState = () => {
        if (this.saveInterval) clearInterval(this.saveInterval);
        this.saveInterval = null;
        localStorage.removeItem(this._getStorageKey());
    };

    public stop() {
        this.isStopped = true;
        this.updateState({ running: false, currentTask: 'Process stopped by user.' });
        this.addLog('Batch process stopped by user.');
        if (this.saveInterval) clearInterval(this.saveInterval);
    }

    private updateState(newState: Partial<BatchProcessState>) {
        this.state = { ...this.state, ...newState };
        this.emit<BatchProcessState>('stateUpdate', this.state);
    }

    private setChapterStatus(chapterId: string, status: ChapterStatus) {
        const newChapters = this.state.chapters.map(c => 
            c.id === chapterId ? { ...c, status } : c
        );
        this.updateState({ chapters: newChapters });
    }

    async start(resumeState?: BatchProcessState) {
        if (this.state.running) return;
        this.updateState({ running: true }); // Ensure it's marked running

        if (resumeState) {
            this.state = { ...resumeState, running: true, currentTask: 'Resuming process...' };
            this.addLog('Resuming unfinished batch process...');
        } else {
            this.addLog('Batch process started.');
            this.updateState({
                running: true,
                phase: 'glossary',
                progress: 0,
                chapters: this.chaptersToProcess.map(c => ({...c, status: ChapterStatus.Pending })),
            });
        }
        
        this.emit<BatchProcessState>('stateUpdate', this.state);
        this.saveInterval = window.setInterval(this._saveState, 30000);

        let phase = this.state.phase;

        if (phase === 'glossary' || phase === 'idle') {
            this.updateState({ phase: 'glossary' });
            if (this.state.chapters.some(c => c.status === ChapterStatus.Pending)) {
                const extractedTerms = await this._runGlossaryExtractionPhase();
                if (this.isStopped) return;
                const termsForReview = this._filterNewTerms(extractedTerms);
                if (termsForReview.length > 0) {
                    await this._requestUserReview(termsForReview);
                }
            }
            if (this.isStopped) return;
            phase = 'translation';
        }

        if (phase === 'translation') {
            this.updateState({ phase: 'translation' });
            await this._runTranslationPhase();
            if (this.isStopped) return;
            phase = 'done';
        }

        this.updateState({ running: false, phase: 'done', currentTask: 'Batch process completed!' });
        this.addLog('Batch process completed!');
        this._clearState();
        this.emit('done');
        this.off('stateUpdate');
    }

    private async _runGlossaryExtractionPhase(): Promise<Omit<GlossaryTerm, 'id'>[]> {
        this.addLog(`Starting glossary extraction for ${this.chaptersToProcess.length} chapters.`);
        this.updateState({ currentTask: `Extracting terms from ${this.chaptersToProcess.length} chapters...` });

        const allExtractedTerms: Omit<GlossaryTerm, 'id'>[] = [];
        let completedCount = 0;
        const CONCURRENCY_LIMIT = 3;
        const chaptersQueue = [...this.chaptersToProcess];

        const worker = async () => {
            while (chaptersQueue.length > 0 && !this.isStopped) {
                const chapter = chaptersQueue.shift();
                if (!chapter) continue;
                
                if (!chapter.sourceText.trim()) {
                    this.setChapterStatus(chapter.id, ChapterStatus.Completed);
                } else {
                    this.setChapterStatus(chapter.id, ChapterStatus.InProgress);
                    const startTime = Date.now();
                    try {
                        const terms = await extractGlossaryTerms(chapter.sourceText, this.targetLang, this.settings.glossaryExtractionInstructions, this.settings.exclusionList, this.settings);
                        allExtractedTerms.push(...terms);
                        const duration = (Date.now() - startTime) / 1000;
                        this.addLog(`[${chapter.name}] Glossary extraction complete in ${duration.toFixed(1)}s. Found ${terms.length} terms.`);
                    } catch (error) {
                        this.addLog(`[${chapter.name}] ERROR: Glossary extraction failed. ${error instanceof Error ? error.message : 'Unknown error'}`);
                        console.error(`Glossary extraction failed for ${chapter.name}:`, error);
                        this.setChapterStatus(chapter.id, ChapterStatus.Failed);
                    }
                }
                
                completedCount++;
                this.updateState({ progress: completedCount / this.chaptersToProcess.length });
            }
        };
        
        const workers = Array(CONCURRENCY_LIMIT).fill(null).map(worker);
        await Promise.all(workers);

        return allExtractedTerms;
    }

    private _filterNewTerms(extractedTerms: Omit<GlossaryTerm, 'id'>[]): Omit<GlossaryTerm, 'id'>[] {
        const uniqueNewTermsMap = new Map<string, Omit<GlossaryTerm, 'id'>>();
        for (const term of extractedTerms) {
            const lowerInput = term.input.toLowerCase();
            if (!this.reviewedTermsCache.has(lowerInput) && !uniqueNewTermsMap.has(lowerInput)) {
                uniqueNewTermsMap.set(lowerInput, term);
            }
        }
        return Array.from(uniqueNewTermsMap.values());
    }

    private async _requestUserReview(termsForReview: Omit<GlossaryTerm, 'id'>[]) {
        this.addLog(`Requesting user review for ${termsForReview.length} new terms.`);
        this.updateState({ currentTask: `Waiting for review of ${termsForReview.length} new terms...` });
        this.state.chapters.forEach(c => {
            if (c.status === ChapterStatus.InProgress) {
                this.setChapterStatus(c.id, ChapterStatus.GlossaryReview);
            }
        });
        
        const termsToAdd = await this.requestGlossaryReview(termsForReview);
        
        if (termsToAdd && termsToAdd.length > 0) {
            this.addLog(`${termsToAdd.length} terms approved and added to glossary.`);
            this.onGlossaryUpdate(termsToAdd);
            const newGlossaryTerms = termsToAdd.map(t => ({...t, id: 'temp' }));
            this.settings.glossary.push(...newGlossaryTerms);
            termsToAdd.forEach(t => this.reviewedTermsCache.add(t.input.toLowerCase()));
        } else {
            this.addLog('No new terms were added from review.');
        }
    }
    
    private async _runTranslationPhase() {
        this.updateState({ phase: 'translation', progress: 0 });
        const newlyTranslatedChapters: Chapter[] = [];
        
        const chaptersToTranslate = this.state.chapters.filter(chapter => 
            chapter.sourceText.trim() !== '' &&
            chapter.status !== ChapterStatus.Completed &&
            chapter.status !== ChapterStatus.Failed
        );

        const totalChapters = this.state.chapters.length;
        let completedCount = totalChapters - chaptersToTranslate.length;
        this.updateState({ progress: completedCount / totalChapters });
        
        const CONCURRENCY_LIMIT = 2;
        const REQUEST_DELAY = 1000;

        const promptCompiler = buildPromptTemplate('en', this.targetLang, this.settings);

        for (let i = 0; i < chaptersToTranslate.length && !this.isStopped; i += CONCURRENCY_LIMIT) {
            const chunk = chaptersToTranslate.slice(i, i + CONCURRENCY_LIMIT);
            
            const promises = chunk.map(async (chapter) => {
                this.updateState({ currentTask: `Translating "${chapter.name}"...` });
                this.setChapterStatus(chapter.id, ChapterStatus.Translating);
                this.addLog(`Starting translation for chapter: "${chapter.name}"...`);
                const startTime = Date.now();

                try {
                    const userPrompt = promptCompiler(chapter.sourceText);
                    const translation = await translateTextStream(chapter.sourceText, 'en', this.targetLang, this.settings, () => {}, userPrompt);
                    
                    if (translation.startsWith('[STREAM_TRANSLATION_ERROR')) {
                        throw new Error(translation);
                    }
                    const duration = (Date.now() - startTime) / 1000;
                    this.addLog(`[${chapter.name}] Translation completed in ${duration.toFixed(1)}s.`);
                    const originalChapter = this.chaptersToProcess.find(c => c.id === chapter.id)!;
                    const updatedChapter: Chapter = { ...originalChapter, translatedText: translation };
                    newlyTranslatedChapters.push(updatedChapter);
                    this.setChapterStatus(chapter.id, ChapterStatus.Completed);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    this.addLog(`[${chapter.name}] ERROR: Translation failed. ${errorMessage}`);
                    console.error(`Failed to translate chapter ${chapter.name}:`, error);
                    this.setChapterStatus(chapter.id, ChapterStatus.Failed);
                } finally {
                    completedCount++;
                    this.updateState({ progress: completedCount / totalChapters });
                }
            });

            await Promise.all(promises);

            if (i + CONCURRENCY_LIMIT < chaptersToTranslate.length) {
                await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
            }
        }

        if (newlyTranslatedChapters.length > 0) {
            this.onChaptersUpdate(newlyTranslatedChapters);
        }
    }


    async startExtractionOnly() {
        if (this.state.running) return;
        this.addLog('Starting batch glossary extraction only...');

        this.updateState({
            running: true,
            phase: 'glossary',
            currentTask: 'Starting extraction...',
            progress: 0,
            chapters: this.chaptersToProcess.map(c => ({...c, status: ChapterStatus.Pending })),
        });
        
        const allExtractedTerms = await this._runGlossaryExtractionPhase();
        this.addLog(`Extraction complete. A total of ${allExtractedTerms.length} potential terms were found across all chapters.`);

        this.updateState({
            running: false,
            phase: 'done',
            currentTask: 'Extraction complete!',
        });
        
        this.emit('extractionDone', allExtractedTerms);
        this.off('stateUpdate');
    }
}
