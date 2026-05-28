
import React, { useState, useRef, useEffect } from 'react';
import type { Project } from '../../types';
import PlusIcon from '../icons/PlusIcon';
import ArrowUpTrayIcon from '../icons/ArrowUpTrayIcon';
import BookOpenIcon from '../icons/BookOpenIcon';
import EllipsisVerticalIcon from '../icons/EllipsisVerticalIcon';
import PencilIcon from '../icons/PencilIcon';
import TrashIcon from '../icons/TrashIcon';
import { useProjectContext } from '../../contexts';
import { ConfirmModal } from '../modals';

interface ProjectCardProps {
    project: Project;
    onOpen: () => void;
    onRename: (newName: string) => void;
    onDelete: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onRename, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(project.name);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        setIsMenuOpen(false);
    };

    return (
        <div className="bg-dark-sidebar rounded-lg shadow-lg flex flex-col transition-all duration-200 hover:shadow-2xl hover:-translate-y-1">
            <div className="p-5 flex-grow">
                 {isEditing ? (
                    <input
                        ref={inputRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        className="text-lg font-bold bg-dark-input text-text-primary w-full px-2 py-1 rounded-md mb-2"
                    />
                ) : (
                    <h3 className="text-lg font-bold text-text-primary truncate" title={project.name}>{project.name}</h3>
                )}
                <p className="text-sm text-text-secondary mt-1">by {project.author || 'Unknown Author'}</p>
                <div className="flex items-center text-text-secondary text-sm mt-4">
                    <BookOpenIcon className="w-4 h-4 mr-2" />
                    <span>{project.chapters.length} {project.chapters.length === 1 ? 'Chapter' : 'Chapters'}</span>
                </div>
            </div>
            <div className="border-t border-border-color p-3 flex justify-between items-center">
                <button 
                    onClick={onOpen}
                    className="text-sm font-semibold text-accent-primary hover:text-accent-primary-hover transition-all transform hover:scale-105"
                >
                    Open Project
                </button>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-1.5 rounded-full hover:bg-dark-hover transition-transform transform hover:scale-110">
                        <EllipsisVerticalIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-36 bg-dark-panel rounded-md shadow-xl z-10 border border-border-color animate-fade-in">
                           <button 
                                onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} 
                                className="w-full text-left flex items-center space-x-2 px-3 py-2 text-sm text-text-primary hover:bg-dark-hover"
                            >
                                <PencilIcon className="w-4 h-4" />
                                <span>Rename</span>
                            </button>
                            <button 
                                onClick={() => { onDelete(); setIsMenuOpen(false); }} 
                                className="w-full text-left flex items-center space-x-2 px-3 py-2 text-sm text-danger hover:bg-dark-hover"
                            >
                                <TrashIcon className="w-4 h-4" />
                                <span>Delete</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const ProjectSelectionView: React.FC = () => {
  const { 
    projects, 
    handleOpenProject, 
    handleAddProject,
    triggerImportProject,
    handleDeleteProject,
    handleRenameProject,
  } = useProjectContext();

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const confirmDelete = () => {
    if (projectToDelete) {
        handleDeleteProject(projectToDelete.id, true);
        setProjectToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-y-auto">
        <header className="bg-dark-sidebar border-b border-border-color p-4 flex justify-between items-center shadow-md">
            <h1 className="text-xl font-bold text-text-primary">AI Novel Weaver</h1>
        </header>
        <main className="flex-1 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-text-primary">My Projects</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => triggerImportProject.current?.()}
                            className="flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium bg-dark-hover text-text-secondary hover:text-text-primary transition-all transform hover:-translate-y-px"
                        >
                            <ArrowUpTrayIcon className="w-5 h-5"/>
                            <span>Import Project</span>
                        </button>
                        <button 
                            onClick={handleAddProject}
                            className="flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-primary-hover transition-all transform hover:-translate-y-px"
                        >
                            <PlusIcon className="w-5 h-5"/>
                            <span>Create Project</span>
                        </button>
                    </div>
                </div>
                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map(project => (
                            <ProjectCard 
                                key={project.id} 
                                project={project}
                                onOpen={() => handleOpenProject(project.id)}
                                onRename={(newName) => handleRenameProject(project.id, newName)}
                                onDelete={() => setProjectToDelete(project)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-border-color rounded-lg">
                        <h3 className="text-lg font-semibold text-text-primary">No projects yet</h3>
                        <p className="text-text-secondary mt-2">Create a new project to get started.</p>
                    </div>
                )}
            </div>
        </main>
        <ConfirmModal 
            isOpen={!!projectToDelete} 
            title="Delete Project"
            message={`Are you sure you want to delete "${projectToDelete?.name}"? This action is irreversible and all chapters and translation memory will be lost.`}
            confirmLabel="Delete Project"
            onConfirm={confirmDelete}
            onCancel={() => setProjectToDelete(null)}
        />
    </div>
  );
};

export default ProjectSelectionView;
