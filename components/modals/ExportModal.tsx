import React, { useState } from 'react';
import { exportService } from '../../services/exportService';
import { useProjectContext } from '../../contexts';

interface ExportModalProps {
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { activeProject } = useProjectContext();
  const [isExporting, setIsExporting] = useState(false);

  // Stop propogation to prevent modal from closing when clicking inside
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleExport = async (format: 'md' | 'docx' | 'pdf' | 'epub') => {
    if (!activeProject) return;
    setIsExporting(true);
    try {
      if (format === 'md') {
        exportService.exportToMarkdown(activeProject);
      } else if (format === 'docx') {
        await exportService.exportToDocx(activeProject);
      } else if (format === 'pdf') {
        await exportService.exportToPdf(activeProject);
      } else if (format === 'epub') {
        await exportService.exportToEpub(activeProject);
      }
    } catch (e) {
      console.error(e);
      alert('Export failed. Check the console for more details.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-dark-surface rounded-xl border border-border-color shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={handleContentClick}
      >
        <div className="flex justify-between items-center p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-primary flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export Project
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors focus:outline-none" aria-label="Close export modal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-text-secondary mb-4">Select a format to export. Only chapters containing translated text will be exported.</p>
          
          <button
            onClick={() => handleExport('md')}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border-color hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-text-primary">Markdown (.md)</span>
            <span className="text-xs text-text-secondary">Best for text editors</span>
          </button>
          
          <button
            onClick={() => handleExport('docx')}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border-color hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-text-primary">Word Document (.docx)</span>
            <span className="text-xs text-text-secondary">Best for MS Word</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border-color hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-text-primary">PDF Document (.pdf)</span>
            <span className="text-xs text-text-secondary">Best for printing</span>
          </button>

          <button
            onClick={() => handleExport('epub')}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border-color hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-text-primary">eBook (.epub)</span>
            <span className="text-xs text-text-secondary">Best for e-readers</span>
          </button>

          {isExporting && (
             <div className="text-center text-sm text-primary py-2 animate-pulse">
                Generating export format...
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
