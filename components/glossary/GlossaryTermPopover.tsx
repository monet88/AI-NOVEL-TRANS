
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { GlossaryTerm, Gender } from '../../types';
import { MatchType } from '../../types';
import XMarkIcon from '../icons/XMarkIcon';

interface GlossaryTermPopoverProps {
  term: GlossaryTerm;
  anchorEl: HTMLElement;
  onSave: (updatedTerm: GlossaryTerm) => void;
  onClose: () => void;
}

const GlossaryTermPopover: React.FC<GlossaryTermPopoverProps> = ({ term, anchorEl, onSave, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [editedTerm, setEditedTerm] = useState<GlossaryTerm>(term);

  useEffect(() => {
    setEditedTerm(term);
  }, [term]);

  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;

    // Use a timeout to allow the popover to render and get its dimensions
    setTimeout(() => {
      if (popoverRef.current) {
          const popoverRect = popoverRef.current.getBoundingClientRect();
          if (left + popoverRect.width > window.innerWidth - 16) {
              left = window.innerWidth - popoverRect.width - 16;
          }
           if (left < 16) {
              left = 16;
          }
          if (top + popoverRect.height > window.innerHeight) {
              top = rect.top + window.scrollY - popoverRect.height - 8;
          }
          setPosition({ top, left });
      }
    }, 0);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && !anchorEl.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorEl, onClose]);

  const handleChange = <K extends keyof GlossaryTerm>(field: K, value: GlossaryTerm[K]) => {
    setEditedTerm(prev => ({...prev, [field]: value}));
  };

  const handleSave = () => {
    onSave(editedTerm);
  };

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="absolute z-50 w-80 bg-dark-panel border border-border-color rounded-lg shadow-2xl p-4 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-text-primary text-lg truncate pr-2" title={term.input}>{term.input}</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-hover flex-shrink-0">
            <XMarkIcon className="w-5 h-5 text-text-secondary"/>
        </button>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Translation</label>
        <input
          type="text"
          value={editedTerm.translation}
          onChange={e => handleChange('translation', e.target.value)}
          className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Gender</label>
          <select
            value={editedTerm.gender}
            onChange={e => handleChange('gender', e.target.value as Gender)}
            className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option>Không xác định</option>
            <option>Neutral</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Match Type</label>
          <select
            value={editedTerm.matchType}
            onChange={e => handleChange('matchType', e.target.value as MatchType)}
            className="w-full bg-dark-input p-2 rounded-md border border-border-color focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value={MatchType.CaseInsensitive}>{MatchType.CaseInsensitive}</option>
            <option value={MatchType.Exact}>{MatchType.Exact}</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end pt-2">
          <button 
            onClick={handleSave}
            className="bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-1.5 px-4 rounded-md text-sm transition-colors"
          >
            Save
          </button>
      </div>
    </div>,
    document.body
  );
};

export default GlossaryTermPopover;
