
import React, { useState, useRef, useEffect } from 'react';
import type { Chapter, Project } from '../../types';
import FileIcon from '../icons/FileIcon';
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';
import PencilIcon from '../icons/PencilIcon';
import FolderIcon from '../icons/FolderIcon';
import ArrowDownTrayIcon from '../icons/ArrowDownTrayIcon';
import ArrowUpTrayIcon from '../icons/ArrowUpTrayIcon';
import DocumentPlusIcon from '../icons/DocumentPlusIcon';
import Squares2x2Icon from '../icons/Squares2x2Icon';
import { useProjectContext, useUIContext } from '../../contexts';
import { ConfirmModal } from '../modals';

interface ProjectItemProps {
    project: Project;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
}

const ProjectItem: React.FC<ProjectItemProps> = React.memo(({ project, isActive, onSelect, onDelete, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(project.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleRename = () => {
        if (name.trim() && name.trim() !== project.name) {
            onRename(name.trim());
        } else {
            setName(project.name);
        }
        setIsEditing(false);
    };

    return (
         <div
            className={`group w-full text-left py-2 pr-1 rounded-md flex items-center justify-between transition-all duration-200 ease-in-out relative ${
                isActive
                ? 'bg-accent-primary text-white pl-4'
                : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary pl-2'
            }`}
        >
            {isActive && <div className="absolute left-1 top-2 bottom-2 w-1 bg-white rounded-full animate-grow-in-vertical origin-top"></div>}
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className="bg-dark-input text-text-primary w-full px-1 rounded"
                />
            ) : (
                <button onClick={onSelect} className="flex items-center space-x-2 truncate flex-grow">
                    <FolderIcon className="flex-shrink-0 w-4 h-4"/>
                    <span className="truncate font-semibold">{project.name}</span>
                </button>
            )}
            {!isEditing && (
                 <div className="hidden group-hover:flex items-center flex-shrink-0">
                    <button onClick={() => setIsEditing(true)} className={`p-1 rounded ${isActive ? 'hover:bg-accent-primary-hover' : 'hover:bg-dark-input'} transform transition-transform hover:scale-110`}>
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className={`p-1 rounded ${isActive ? 'hover:bg-accent-primary-hover' : 'hover:bg-dark-input'} transform transition-transform hover:scale-110`}>
                        <TrashIcon className="w-4 h-4" />
                    </button>
                 </div>
            )}
        </div>
    );
});

interface ChapterItemProps {
    chapter: Chapter;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
    isDraggingOver: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
}

const ChapterItem: React.FC<ChapterItemProps> = React.memo(({ 
    chapter, isActive, onSelect, onDelete, onRename, isDraggingOver,
    onDragStart, onDragOver, onDrop, onDragEnter, onDragLeave, onDragEnd
 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(chapter.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(chapter.name);
    }, [chapter.name]);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleRename = () => {
        if (name.trim() && name.trim() !== chapter.name) {
            onRename(name.trim());
        } else {
            setName(chapter.name);
        }
        setIsEditing(false);
    };

    return (
         <div
            draggable={!isEditing}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragEnd={onDragEnd}
            className={`group w-full text-left py-2 pr-1 rounded-md flex items-center justify-between transition-all duration-200 ease-in-out relative ${
                isActive
                ? 'bg-accent-primary text-white pl-4'
                : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary pl-2'
            }`}
        >
            {isDraggingOver && (
                <div className="absolute top-0 left-2 right-2 h-0.5 bg-white opacity-75 rounded-full z-10"></div>
            )}
            {isActive && <div className="absolute left-1 top-2 bottom-2 w-1 bg-white rounded-full animate-grow-in-vertical origin-top"></div>}
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className="bg-dark-input text-text-primary w-full px-1 rounded"
                />
            ) : (
                <button onClick={onSelect} className="flex items-center space-x-2 truncate flex-grow">
                    <FileIcon className="flex-shrink-0 w-4 h-4"/>
                    <span className="truncate">{chapter.name}</span>
                </button>
            )}
            {!isEditing && (
                 <div className="hidden group-hover:flex items-center flex-shrink-0">
                    <button onClick={() => setIsEditing(true)} className={`p-1 rounded ${isActive ? 'hover:bg-accent-primary-hover' : 'hover:bg-dark-input'} transform transition-transform hover:scale-110`}>
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className={`p-1 rounded ${isActive ? 'hover:bg-accent-primary-hover' : 'hover:bg-dark-input'} transform transition-transform hover:scale-110`}>
                        <TrashIcon className="w-4 h-4" />
                    </button>
                 </div>
            )}
        </div>
    );
});


const Sidebar: React.FC = () => {
  const {
    projects,
    activeProjectId,
    activeProject,
    activeChapterId,
    handleSelectProject,
    handleAddProject,
    handleDeleteProject,
    handleRenameProject,
    handleExportProject,
    triggerImportProject,
    setActiveChapterId,
    handleAddChapter,
    handleDeleteChapter,
    handleRenameChapter,
    handleReorderChapters,
    handleBackToDashboard,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useProjectContext();

  const { setIsImportFilesModalOpen } = useUIContext();

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);

  const chapters = activeProject?.chapters ?? [];
  
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
      e.dataTransfer.effectAllowed = 'move';
      setDraggedChapterId(chapterId);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropTargetChapterId: string) => {
      e.preventDefault();
      if (draggedChapterId && draggedChapterId !== dropTargetChapterId) {
          handleReorderChapters(draggedChapterId, dropTargetChapterId);
      }
      handleDragEnd();
  };

  const handleDragEnter = (e: React.DragEvent, chapterId: string) => {
      e.preventDefault();
      if (chapterId !== draggedChapterId) {
          setDragOverChapterId(chapterId);
      }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDragEnd = () => {
      setDraggedChapterId(null);
      setDragOverChapterId(null);
  };
  
  const selectProjectAndCloseSidebar = (projectId: string) => {
    handleSelectProject(projectId);
    setIsSidebarOpen(false);
  }

  const selectChapterAndCloseSidebar = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setIsSidebarOpen(false);
  }

  return (
    <aside className={`fixed lg:relative inset-y-0 left-0 z-30 w-72 bg-dark-sidebar border-r border-border-color p-2 flex flex-col space-y-2 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      {/* Projects Section */}
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-1 pr-2">
            <h3 className="px-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Projects</h3>
            <div className="flex items-center space-x-1">
                <button onClick={handleBackToDashboard} className="p-1 rounded hover:bg-dark-hover transform transition-transform hover:scale-110" title="All Projects">
                    <Squares2x2Icon className="w-4 h-4 text-text-secondary"/>
                </button>
                <button onClick={() => triggerImportProject.current?.()} className="p-1 rounded hover:bg-dark-hover transform transition-transform hover:scale-110" title="Import Project">
                    <ArrowUpTrayIcon className="w-4 h-4 text-text-secondary"/>
                </button>
                <button onClick={handleExportProject} className="p-1 rounded hover:bg-dark-hover disabled:opacity-50 transform transition-transform hover:scale-110" title="Export Active Project" disabled={!activeProjectId}>
                    <ArrowDownTrayIcon className="w-4 h-4 text-text-secondary"/>
                </button>
            </div>
        </div>
        <button onClick={handleAddProject} className="w-full text-left p-2 rounded-md flex items-center space-x-2 transition-all duration-150 text-text-secondary hover:bg-dark-hover hover:text-text-primary transform hover:-translate-y-px">
            <PlusIcon className="w-5 h-5"/>
            <span className="font-semibold">Create Project</span>
        </button>
        <div className="mt-1 max-h-48 overflow-y-auto">
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectItem
                    project={project}
                    isActive={activeProjectId === project.id}
                    onSelect={() => selectProjectAndCloseSidebar(project.id)}
                    onDelete={() => setProjectToDelete(project)}
                    onRename={(newName) => handleRenameProject(project.id, newName)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chapters Section */}
      {activeProjectId && (
        <div className="flex-grow flex flex-col min-h-0 border-t border-border-color pt-2">
          <div className="flex-shrink-0 space-y-1">
            <h3 className="px-2 text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Chapters</h3>
            <button onClick={handleAddChapter} className="w-full text-left p-2 rounded-md flex items-center space-x-2 transition-all duration-150 text-text-secondary hover:bg-dark-hover hover:text-text-primary transform hover:-translate-y-px">
                <PlusIcon className="w-5 h-5"/>
                <span className="font-semibold">Create Chapter</span>
            </button>
             <button onClick={() => setIsImportFilesModalOpen(true)} className="w-full text-left p-2 rounded-md flex items-center space-x-2 transition-all duration-150 text-text-secondary hover:bg-dark-hover hover:text-text-primary transform hover:-translate-y-px">
                <DocumentPlusIcon className="w-5 h-5"/>
                <span className="font-semibold">Import from Files</span>
            </button>
          </div>
          <div className="overflow-y-auto flex-grow mt-1">
            <ul>
                {chapters.map((chapter) => (
                <li key={chapter.id}>
                    <ChapterItem
                        chapter={chapter}
                        isActive={activeChapterId === chapter.id}
                        onSelect={() => selectChapterAndCloseSidebar(chapter.id)}
                        onDelete={() => setChapterToDelete(chapter)}
                        onRename={(newName) => handleRenameChapter(chapter.id, newName)}
                        isDraggingOver={dragOverChapterId === chapter.id && draggedChapterId !== chapter.id}
                        onDragStart={(e) => handleDragStart(e, chapter.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, chapter.id)}
                        onDragEnter={(e) => handleDragEnter(e, chapter.id)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                    />
                </li>
                ))}
            </ul>
          </div>
        </div>
      )}
      
      <div className="border-t border-border-color pt-2 text-sm mt-auto">
        {/* Placeholder for bottom controls */}
      </div>

      <ConfirmModal 
        isOpen={!!projectToDelete} 
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? This action is irreversible and all chapters and translation memory will be lost.`}
        confirmLabel="Delete Project"
        onConfirm={() => {
            if (projectToDelete) {
                handleDeleteProject(projectToDelete.id, true);
                setProjectToDelete(null);
            }
        }}
        onCancel={() => setProjectToDelete(null)}
      />

      <ConfirmModal 
        isOpen={!!chapterToDelete} 
        title="Delete Chapter"
        message={`Are you sure you want to delete "${chapterToDelete?.name}"? This action is irreversible.`}
        confirmLabel="Delete Chapter"
        onConfirm={() => {
            if (chapterToDelete) {
                handleDeleteChapter(chapterToDelete.id);
                setChapterToDelete(null);
            }
        }}
        onCancel={() => setChapterToDelete(null)}
      />
    </aside>
  );
};

export default Sidebar;
