
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Chapter, TranslationSettings } from '../types';
import { INITIAL_PROJECTS } from '../constants';
import { ProjectSchema } from '../schema';
import type { BatchProcessState } from '../services/batchOrchestrator';
import { ChapterStatus } from '../services/batchOrchestrator';
import { persistenceService } from '../services/persistenceService';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [view, setView] = useState<'dashboard' | 'workspace'>('dashboard');
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [pendingResumeJob, setPendingResumeJob] = useState<{ projectId: string; state: BatchProcessState } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const saveTimeoutRef = useRef<number | null>(null);
  const triggerImportProject = useRef<(() => void) | null>(null);

  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    const loadData = async () => {
      try {
        let loadedProjects = await persistenceService.loadProjects();
        if (loadedProjects && loadedProjects.length > 0) {
          loadedProjects = loadedProjects.map(p => ({
              ...p,
              author: p.author || 'Unknown Author',
              translationMemory: p.translationMemory || [],
          }));
          setProjects(loadedProjects);
        } else {
          // Fallback to localstorage for migrating old data if any
          const savedProjects = localStorage.getItem('ai-novel-weaver-projects');
          if (savedProjects) {
            let parsedProjects: Project[] = JSON.parse(savedProjects);
            parsedProjects = parsedProjects.map(p => ({
                ...p,
                author: p.author || 'Unknown Author',
                translationMemory: p.translationMemory || [],
            }));
            setProjects(parsedProjects);
            await persistenceService.saveProjects(parsedProjects);
          } else {
            setProjects(INITIAL_PROJECTS);
          }
        }
        setView('dashboard');
        setActiveProjectId(null);
        setActiveChapterId(null);
      } catch (error) {
        console.error("Failed to load projects", error);
        setProjects(INITIAL_PROJECTS);
      } finally {
        setIsAppLoaded(true);
      }
    };
    loadData();
  }, []);
  
  const handleOpenProject = useCallback((projectId: string) => {
      const project = projectsRef.current.find(p => p.id === projectId);
      if (project) {
          setActiveProjectId(projectId);
          setActiveChapterId(project.chapters.length > 0 ? project.chapters[0].id : null);
          setView('workspace');
      }
  }, []);

  useEffect(() => {
    if (!isAppLoaded) return;
    
    const storageKey = Object.keys(localStorage).find(k => k.startsWith('batch-progress-'));
    if (storageKey) {
        const projectId = storageKey.replace('batch-progress-', '');
        const savedStateJSON = localStorage.getItem(storageKey);
        
        if (savedStateJSON) {
            try {
                const savedState: BatchProcessState = JSON.parse(savedStateJSON);
                const project = projectsRef.current.find(p => p.id === projectId);
                if (project) {
                    const currentChapterIndex = savedState.chapters.findIndex(c => c.status !== ChapterStatus.Completed && c.status !== ChapterStatus.Failed && c.status !== ChapterStatus.Pending);
                    const currentChapterName = currentChapterIndex > -1 ? savedState.chapters[currentChapterIndex].name : 'the beginning';

                    if (window.confirm(`An unfinished batch job was found for project "${project.name}".\n\nDo you want to resume from chapter "${currentChapterName}"?`)) {
                        setPendingResumeJob({ projectId, state: savedState });
                        handleOpenProject(projectId);
                    } else {
                        localStorage.removeItem(storageKey);
                    }
                } else {
                    localStorage.removeItem(storageKey);
                }
            } catch (e) {
                console.error("Failed to parse saved batch state, removing.", e);
                localStorage.removeItem(storageKey);
            }
        }
    }
  }, [isAppLoaded, handleOpenProject]);

  const triggerProjectSave = useCallback(() => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await persistenceService.saveProjects(projectsRef.current);
        setSaveStatus('saved');
      } catch (error) {
        console.error("Failed to save projects to IndexedDB", error);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    if (isAppLoaded) {
      triggerProjectSave();
    }
  }, [projects, isAppLoaded, triggerProjectSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      try {
        // We can't await in beforeunload, idb may not finish. So we try localstorage fallback or leave it to periodic save.
        // Actually since we debounce by 1000ms, data loss is minimal. We'll still do localStorage as a backup.
        localStorage.setItem('ai-novel-weaver-projects-backup', JSON.stringify(projectsRef.current));
      } catch (error) {
        console.error("Failed to backup data to localStorage on unload", error);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const activeChapter = useMemo(() => activeProject?.chapters.find(c => c.id === activeChapterId), [activeProject, activeChapterId]);

  const handleBackToDashboard = () => {
      setActiveProjectId(null);
      setActiveChapterId(null);
      setView('dashboard');
  };

  const handleSelectProject = (projectId: string) => {
    if (activeProjectId === projectId) return;
    setActiveProjectId(projectId);
    const project = projects.find(p => p.id === projectId);
    if (project?.chapters.length) {
      setActiveChapterId(project.chapters[0].id);
    } else {
      setActiveChapterId(null);
    }
  };

  const handleAddProject = () => {
    const newProject: Project = {
      id: uuidv4(),
      name: `New Project ${projects.length + 1}`,
      author: 'New Author',
      chapters: [],
      translationMemory: [],
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setActiveChapterId(null);
    setView('workspace');
  };

  const handleDeleteProject = (projectId: string, skipConfirm = false) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;
    
    if (!skipConfirm && !window.confirm(`Are you sure you want to delete "${projectToDelete.name}"? This action is irreversible.`)) {
        return;
    }
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
        handleBackToDashboard();
    }
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
  };

  const handleAddChapter = () => {
    if (!activeProjectId) return;
    const newChapter: Chapter = {
      id: uuidv4(),
      name: `New Chapter ${activeProject?.chapters.length ? activeProject.chapters.length + 1 : 1}`,
      sourceText: '',
      translatedText: '',
    };
    setProjects(prev => prev.map(p =>
      p.id === activeProjectId ? { ...p, chapters: [...p.chapters, newChapter] } : p
    ));
    setActiveChapterId(newChapter.id);
  };

  const handleDeleteChapter = (chapterId: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        const updatedChapters = p.chapters.filter(c => c.id !== chapterId);
        if (activeChapterId === chapterId) {
            setActiveChapterId(updatedChapters.length > 0 ? updatedChapters[0].id : null);
        }
        return { ...p, chapters: updatedChapters };
    }));
  };

  const handleRenameChapter = (chapterId: string, newName: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        return { ...p, chapters: p.chapters.map(c => c.id === chapterId ? { ...c, name: newName } : c) };
    }));
  };

  const handleChapterChange = useCallback((chapterId: string, updates: Partial<Chapter>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return { ...p, chapters: p.chapters.map(c => c.id === chapterId ? { ...c, ...updates } : c) };
    }));
  }, [activeProjectId]);

  const handleUpdateChapters = (updatedChapters: Chapter[]) => {
      setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        const newChapters = p.chapters.map(c => {
          const updated = updatedChapters.find(uc => uc.id === c.id);
          return updated || c;
        });
        return { ...p, chapters: newChapters };
      }));
  };

  const handleReorderChapters = (draggedChapterId: string, dropTargetChapterId: string) => {
      setProjects(prev => prev.map(p => {
          if (p.id !== activeProjectId) return p;
          const chapters = [...p.chapters];
          const draggedIndex = chapters.findIndex(c => c.id === draggedChapterId);
          const dropTargetIndex = chapters.findIndex(c => c.id === dropTargetChapterId);
          if (draggedIndex === -1 || dropTargetIndex === -1) return p;
          const [draggedItem] = chapters.splice(draggedIndex, 1);
          chapters.splice(dropTargetIndex, 0, draggedItem);
          return { ...p, chapters };
      }));
  };

  const handleAddToTranslationMemory = (source: string, target: string) => {
    if (!activeProjectId || !source || !target) return;
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === activeProjectId) {
        const newMemory = [...p.translationMemory];
        if (!newMemory.some(entry => entry.source === source)) {
            newMemory.push({ source, target });
        }
        return { ...p, translationMemory: newMemory };
      }
      return p;
    }));
  };

  const handleExportProject = () => {
    if (!activeProject) return;
    const jsonString = JSON.stringify(activeProject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject.name.replace(/\s/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not readable text.");
            const parsedJson = JSON.parse(text);
            
            // Validate structure using Zod schema
            const validationResult = ProjectSchema.safeParse(parsedJson);
            if (!validationResult.success) {
                console.error("Zod Validation Error:", validationResult.error);
                throw new Error("Invalid project file format.");
            }
            
            const importedProject = validationResult.data;
            
            if (projects.find(p => p.id === importedProject.id)) {
                importedProject.id = uuidv4();
                importedProject.name = `${importedProject.name} (Imported)`;
            }
            if (!importedProject.translationMemory) importedProject.translationMemory = [];
            if (!importedProject.author) importedProject.author = 'Imported Author';
            setProjects(prev => [...prev, importedProject]);
            setActiveProjectId(importedProject.id);
            setActiveChapterId(importedProject.chapters.length > 0 ? importedProject.chapters[0].id : null);
            setView('workspace');
            alert(`Project "${importedProject.name}" imported successfully.`);
        } catch (error) {
            console.error("Failed to import project:", error);
            alert(`Error importing project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handleImportChaptersFromFiles = (chaptersToImport: { name: string, sourceText: string }[]) => {
    if (!activeProjectId || chaptersToImport.length === 0) return;
    const newChapters: Chapter[] = chaptersToImport.map(item => ({
        id: uuidv4(), name: item.name, sourceText: item.sourceText, translatedText: '',
    }));
    setProjects(prev => prev.map(p =>
      p.id === activeProjectId ? { ...p, chapters: [...p.chapters, ...newChapters] } : p
    ));
    setActiveChapterId(newChapters[0].id);
  };
  
  const clearPendingResumeJob = () => setPendingResumeJob(null);

  return {
    projects,
    activeProjectId,
    activeChapterId,
    saveStatus,
    view,
    pendingResumeJob,
    isSidebarOpen,
    setIsSidebarOpen,
    activeProject,
    activeChapter,
    handleOpenProject,
    handleBackToDashboard,
    handleSelectProject,
    handleAddProject,
    handleDeleteProject,
    handleRenameProject,
    handleAddChapter,
    handleDeleteChapter,
    handleRenameChapter,
    handleChapterChange,
    handleUpdateChapters,
    handleReorderChapters,
    handleAddToTranslationMemory,
    setActiveChapterId,
    handleExportProject,
    handleImportProject,
    triggerImportProject,
    handleImportChaptersFromFiles,
    clearPendingResumeJob,
  };
};
