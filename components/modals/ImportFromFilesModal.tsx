// FIX: The original file was truncated, leading to a build error because the component was not fully defined and had no default export.
// The component has been fully implemented below, including drag-and-drop for file selection and reordering, and the necessary `export default` statement has been added.

import React, { useState, useCallback, useEffect } from 'react';
import XMarkIcon from '../icons/XMarkIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';
import Bars2Icon from '../icons/Bars2Icon';

interface ImportFromFilesModalProps {
  onClose: () => void;
  onImport: (chapters: { name: string, sourceText: string }[]) => void;
}

const ImportFromFilesModal: React.FC<ImportFromFilesModalProps> = ({ onClose, onImport }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isLoading]);

  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles).filter(file => 
      file.type === 'text/plain' || 
      file.type === 'text/markdown' || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.md')
    );
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);
  
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };
  
  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDropTargetIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      const newFiles = [...files];
      const [draggedItem] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(dropTargetIndex, 0, draggedItem);
      setFiles(newFiles);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };
  
  const handleImportClick = async () => {
    if (files.length === 0) {
      setError('Please add at least one file.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    const chaptersToCreate: { name: string, sourceText: string }[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const name = file.name.replace(/\.(txt|md)$/i, '');
        chaptersToCreate.push({ name, sourceText: text });
      } catch (e) {
        setError(`Could not read file: ${file.name}`);
        setIsLoading(false);
        return;
      }
    }
    
    onImport(chaptersToCreate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-panel rounded-xl shadow-2xl w-full max-w-xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-border-color flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold">Import Chapters from Files</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-hover" disabled={isLoading}>
            <XMarkIcon className="w-6 h-6 text-text-secondary"/>
          </button>
        </header>

        <div className="flex-grow p-6 space-y-4 overflow-y-auto">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? 'border-accent-primary bg-accent-primary/10' : 'border-border-color'}`}
          >
            <input
              type="file"
              multiple
              accept=".txt,.md,text/plain,text/markdown"
              onChange={e => handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
              aria-label="Import chapter files"
            />
            <DocumentTextIcon className="mx-auto h-12 w-12 text-text-secondary" />
            <p className="mt-2 text-sm text-text-primary">Drag and drop files here</p>
            <p className="text-xs text-text-secondary">or click to browse (.txt, .md)</p>
          </div>
          
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-secondary">Files to import (drag to reorder):</h3>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className={`flex items-center space-x-3 p-2 rounded-md bg-dark-input transition-opacity ${draggedIndex === index ? 'opacity-50' : ''} ${dropTargetIndex === index ? 'border-t-2 border-accent-primary' : ''}`}
                  >
                    <Bars2Icon className="w-5 h-5 text-text-secondary cursor-grab" />
                    <DocumentTextIcon className="w-5 h-5 text-text-primary flex-shrink-0" />
                    <span className="text-sm text-text-primary truncate flex-grow" title={file.name}>{file.name}</span>
                    <button onClick={() => handleRemoveFile(index)} className="p-1 rounded-full hover:bg-dark-hover flex-shrink-0">
                      <XMarkIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <footer className="p-4 border-t border-border-color flex justify-end items-center flex-shrink-0 bg-dark-sidebar rounded-b-xl">
          <button
            onClick={handleImportClick}
            disabled={isLoading || files.length === 0}
            className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg flex items-center space-x-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{isLoading ? 'Importing...' : `Import ${files.length} Chapters`}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ImportFromFilesModal;
