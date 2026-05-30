
import React, { useState, useEffect } from 'react';
import { v4 as uuidvv4 } from 'uuid';
import type { GlossaryTerm, Gender } from '../../types';
import { MatchType } from '../../types';
import XMarkIcon from '../icons/XMarkIcon';
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';
import { useCountdown } from '../../hooks/useCountdown';
import PauseIcon from '../icons/PauseIcon';
import PlayIcon from '../icons/PlayIcon';

interface GlossaryReviewModalProps {
  extractedTerms: Omit<GlossaryTerm, 'id'>[];
  onComplete: (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => void;
}

interface ReviewTerm extends Omit<GlossaryTerm, 'id'> {
  reviewId: string;
}

const GlossaryReviewModal: React.FC<GlossaryReviewModalProps> = ({ extractedTerms, onComplete }) => {
  const [reviewTerms, setReviewTerms] = useState<ReviewTerm[]>([]);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const termsWithIds = extractedTerms.map(term => ({
      ...term,
      reviewId: uuidvv4(),
    }));
    setReviewTerms(termsWithIds);
    setSelectedReviewIds(new Set(termsWithIds.map(t => t.reviewId)));
  }, [extractedTerms]);

  const handleTimeout = () => {
    onComplete([]); // Automatically close with no new terms on timeout
  };

  const { secondsLeft, isPaused, pause, resume } = useCountdown(30, { onTimeout: handleTimeout });

  const handleToggleSelection = (reviewId: string) => {
    setSelectedReviewIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => setSelectedReviewIds(new Set(reviewTerms.map(t => t.reviewId)));
  const handleDeselectAll = () => setSelectedReviewIds(new Set());

  const handleTermChange = <K extends keyof ReviewTerm>(reviewId: string, field: K, value: ReviewTerm[K]) => {
    setReviewTerms(prev =>
      prev.map(term =>
        term.reviewId === reviewId ? { ...term, [field]: value } : term
      )
    );
  };
  
  const handleDeleteTerm = (reviewId: string) => {
      setReviewTerms(prev => prev.filter(term => term.reviewId !== reviewId));
      setSelectedReviewIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(reviewId);
          return newSet;
      });
  };

  const handleAddSelected = () => {
    const termsToAdd = reviewTerms
      .filter(term => selectedReviewIds.has(term.reviewId))
      .map(({ reviewId, ...term }) => ({
          ...term,
          gender: term.gender || 'Không xác định',
          matchType: term.matchType || MatchType.CaseInsensitive,
      }));
    
    onComplete(termsToAdd);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-dark-panel rounded-xl shadow-2xl w-full h-full sm:max-w-4xl sm:h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-border-color flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold">Review Suggested Terms</h2>
          </div>
          <button onClick={() => onComplete([])} className="p-1 rounded-full hover:bg-dark-hover">
            <XMarkIcon className="w-6 h-6 text-text-secondary" />
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-2 sm:p-6">
          <div className="flex justify-between items-center mb-4 px-4 sm:px-0">
            <p className="text-sm text-text-secondary">
              Review and edit the terms suggested by the AI. Deselect any terms you don't want to add.
            </p>
            <div className="flex space-x-2">
              <button onClick={handleSelectAll} className="text-xs font-semibold text-accent-primary hover:underline">Select All</button>
              <button onClick={handleDeselectAll} className="text-xs font-semibold text-accent-primary hover:underline">Deselect All</button>
            </div>
          </div>
          
          {reviewTerms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[640px]">
                <thead className="text-text-secondary sticky top-0 bg-dark-panel">
                  <tr>
                    <th className="p-2 w-8">Select</th>
                    <th className="p-2">Input</th>
                    <th className="p-2">Translation</th>
                    <th className="p-2">Gender</th>
                    <th className="p-2">Match</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewTerms.map(term => (
                    <tr key={term.reviewId} className="border-b border-border-color hover:bg-dark-hover">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedReviewIds.has(term.reviewId)}
                          onChange={() => handleToggleSelection(term.reviewId)}
                          className="h-4 w-4 rounded-md bg-dark-hover border-border-color text-accent-primary focus:ring-accent-primary"
                          aria-label="Select glossary term"
                        />
                      </td>
                      <td><input type="text" value={term.input} onChange={e => handleTermChange(term.reviewId, 'input', e.target.value)} className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md" aria-label="Glossary input term" /></td>
                      <td><input type="text" value={term.translation} onChange={e => handleTermChange(term.reviewId, 'translation', e.target.value)} className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md" aria-label="Glossary translation" /></td>
                      <td>
                        <select value={term.gender} onChange={e => handleTermChange(term.reviewId, 'gender', e.target.value as Gender)} className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md appearance-none" aria-label={`Gender for ${term.input}`}>
                          <option>Không xác định</option><option>Neutral</option><option>Male</option><option>Female</option>
                        </select>
                      </td>
                      <td>
                        <select value={term.matchType} onChange={e => handleTermChange(term.reviewId, 'matchType', e.target.value as MatchType)} className="w-full bg-transparent p-2 focus:bg-dark-input focus:outline-none focus:ring-1 focus:ring-accent-primary rounded-md appearance-none" aria-label={`Match type for ${term.input}`}>
                          <option value={MatchType.CaseInsensitive}>{MatchType.CaseInsensitive}</option>
                          <option value={MatchType.Exact}>{MatchType.Exact}</option>
                        </select>
                      </td>
                      <td className="text-center"><button onClick={() => handleDeleteTerm(term.reviewId)} className="p-2 text-text-secondary hover:text-danger" aria-label={`Delete term ${term.input}`}><TrashIcon className="w-5 h-5"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="text-center py-16 text-text-secondary">
                No terms were extracted. You can adjust the rules in the AI settings.
             </div>
          )}
        </div>

        <footer className="p-4 border-t border-border-color flex flex-col-reverse sm:flex-row justify-between items-center flex-shrink-0 bg-dark-sidebar rounded-b-xl gap-4">
          <div className="flex items-center space-x-2 text-sm text-text-secondary w-full sm:w-auto justify-center sm:justify-start">
            <button
                onClick={isPaused ? resume : pause}
                className="p-2 rounded-full hover:bg-dark-input transition-colors"
                title={isPaused ? 'Resume Countdown' : 'Pause Countdown'}
            >
                {isPaused ? <PlayIcon className="w-5 h-5"/> : <PauseIcon className="w-5 h-5"/>}
            </button>
            <span className={`font-mono transition-colors ${secondsLeft <= 5 && !isPaused ? 'text-danger animate-pulse' : ''}`}>
                Auto-skipping in {String(secondsLeft).padStart(2, '0')}s...
            </span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button onClick={() => onComplete([])} className="flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-medium bg-dark-hover text-text-primary hover:bg-dark-input">
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedReviewIds.size === 0}
              className="flex-1 sm:flex-none bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-5 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon />
              <span>{`Add ${selectedReviewIds.size} Terms`}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default GlossaryReviewModal;
