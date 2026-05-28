import React from 'react';
import ReactDOM from 'react-dom';
import type { GlossaryTerm } from '../../types';

interface GlossaryTermTooltipProps {
  term: GlossaryTerm;
  top: number;
  left: number;
  context?: 'source' | 'target';
}

const GlossaryTermTooltip: React.FC<GlossaryTermTooltipProps> = ({ term, top, left, context = 'source' }) => {
  const mainText = context === 'source' ? term.translation : term.input;
  const subTextLabel = context === 'source' ? 'Translation' : 'Original';

  return ReactDOM.createPortal(
    <div
      style={{ top: `${top + 15}px`, left: `${left + 15}px` }}
      className="fixed z-[100] w-max max-w-xs bg-dark-sidebar border border-border-color rounded-md shadow-lg p-3 text-sm text-text-primary pointer-events-none animate-fade-in"
    >
      <div className="text-xs text-text-secondary">{subTextLabel}</div>
      <div className="font-bold text-base mb-1">{mainText}</div>
      <div className="text-xs text-text-secondary grid grid-cols-2 gap-x-4">
        <span>Gender:</span>
        <span className="font-semibold">{term.gender}</span>
        <span>Match:</span>
        <span className="font-semibold">{term.matchType}</span>
      </div>
    </div>,
    document.body
  );
};

export default GlossaryTermTooltip;