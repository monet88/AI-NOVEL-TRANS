import React, { useState, useMemo, useEffect } from 'react';
import XMarkIcon from '../icons/XMarkIcon';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  onReplace: (newText: string) => void;
}

const FindReplaceModal: React.FC<FindReplaceModalProps> = ({ isOpen, onClose, initialText, onReplace }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const matchesCount = useMemo(() => {
    if (!findText) return 0;
    const regex = new RegExp(findText, caseSensitive ? 'g' : 'gi');
    return (initialText.match(regex) || []).length;
  }, [findText, initialText, caseSensitive]);

  const handleReplaceAll = () => {
    if (!findText) return;
    const regex = new RegExp(findText, caseSensitive ? 'g' : 'gi');
    const newText = initialText.replace(regex, replaceText);
    onReplace(newText);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4" onClick={onClose}>
        <div className="bg-dark-panel rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <header className="p-4 border-b border-border-color flex justify-between items-center">
                <h2 className="text-lg font-bold">Find & Replace</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-hover">
                    <XMarkIcon className="w-6 h-6 text-text-secondary"/>
                </button>
            </header>
            <div className="p-6 space-y-4">
                 <div>
                    <label htmlFor="find-text" className="block text-sm font-medium text-text-secondary mb-1">
                        Find
                    </label>
                    <input
                        id="find-text"
                        type="text"
                        value={findText}
                        onChange={e => setFindText(e.target.value)}
                        className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        aria-label="Find text"
                    />
                </div>
                 <div>
                    <label htmlFor="replace-text" className="block text-sm font-medium text-text-secondary mb-1">
                        Replace with
                    </label>
                    <input
                        id="replace-text"
                        type="text"
                        value={replaceText}
                        onChange={e => setReplaceText(e.target.value)}
                        className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        aria-label="Replace text"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <input
                            id="case-sensitive"
                            type="checkbox"
                            checked={caseSensitive}
                            onChange={e => setCaseSensitive(e.target.checked)}
                            className="h-4 w-4 rounded-md bg-dark-hover border-border-color text-accent-primary focus:ring-accent-primary"
                            aria-label="Case sensitive"
                        />
                        <label htmlFor="case-sensitive" className="ml-2 text-sm text-text-primary">
                            Case Sensitive
                        </label>
                    </div>
                    {findText && <span className="text-sm text-text-secondary">{matchesCount} matches found</span>}
                </div>
            </div>
            <footer className="p-4 bg-dark-sidebar border-t border-border-color text-right rounded-b-xl">
                <button 
                    onClick={handleReplaceAll}
                    disabled={!findText || matchesCount === 0}
                    className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Replace All
                </button>
            </footer>
        </div>
    </div>
  );
};

export default FindReplaceModal;