
import React, { useState, useEffect } from 'react';
import { v4 as uuidvv4 } from 'uuid';
import type { GlossaryTerm, Gender } from '../../types';
import { MatchType } from '../../types';
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';

interface InteractiveGlossaryApprovalProps {
  terms: Omit<GlossaryTerm, 'id'>[];
  onComplete: (termsToAdd: Omit<GlossaryTerm, 'id'>[]) => void;
  onCancel: () => void;
}

interface ReviewTerm extends Omit<GlossaryTerm, 'id'> {
  reviewId: string;
}

const InteractiveGlossaryApproval: React.FC<InteractiveGlossaryApprovalProps> = ({ terms, onComplete, onCancel }) => {
  const [reviewTerms, setReviewTerms] = useState<ReviewTerm[]>([]);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const termsWithIds = terms.map(term => ({
      ...term,
      reviewId: uuidvv4(),
    }));
    setReviewTerms(termsWithIds);
    setSelectedReviewIds(new Set(termsWithIds.map(t => t.reviewId)));
  }, [terms]);

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

  const handleApply = () => {
    const termsToAdd = reviewTerms
      .filter(term => selectedReviewIds.has(term.reviewId))
      .map(({ reviewId, ...term }) => ({
          ...term,
          gender: term.gender || 'Neutral',
          matchType: term.matchType || MatchType.CaseInsensitive,
      }));
    
    onComplete(termsToAdd);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-4">
        <h3 className="text-md font-bold text-text-primary">Interactive Glossary Pre-Scan</h3>
        <p className="text-sm text-text-secondary">
          The AI detected the following potential terms. Review and confirm them before proceeding to translation.
        </p>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-text-muted">{selectedReviewIds.size} terms selected</span>
        <div className="flex space-x-2">
          <button onClick={handleSelectAll} className="text-xs font-semibold text-accent-primary hover:underline">Select All</button>
          <button onClick={handleDeselectAll} className="text-xs font-semibold text-accent-primary hover:underline">Deselect All</button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto border border-border-color rounded-lg bg-dark-input min-h-0">
          {reviewTerms.length > 0 ? (
             <table className="w-full text-sm text-left">
                <thead className="text-text-secondary sticky top-0 bg-dark-panel border-b border-border-color z-10">
                  <tr>
                    <th className="p-2 w-8">Select</th>
                    <th className="p-2">Input Term</th>
                    <th className="p-2">Suggested Translation</th>
                    <th className="p-2">Gender</th>
                    <th className="p-2 w-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewTerms.map(term => (
                    <tr key={term.reviewId} className="border-b border-border-color last:border-0 hover:bg-dark-hover">
                      <td className="p-2 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={selectedReviewIds.has(term.reviewId)}
                          onChange={() => handleToggleSelection(term.reviewId)}
                          className="h-4 w-4 rounded bg-dark-bg border-border-color text-accent-primary focus:ring-accent-primary"
                          aria-label="Select glossary term"
                        />
                      </td>
                      <td className="p-1">
                        <input
                            type="text"
                            value={term.input}
                            onChange={e => handleTermChange(term.reviewId, 'input', e.target.value)}
                            className="w-full bg-transparent p-1 px-2 focus:bg-dark-panel focus:outline-none focus:ring-1 focus:ring-accent-primary rounded"
                            aria-label="Glossary input term"
                        />
                      </td>
                      <td className="p-1">
                        <input
                            type="text"
                            value={term.translation}
                            onChange={e => handleTermChange(term.reviewId, 'translation', e.target.value)}
                            className="w-full bg-transparent p-1 px-2 focus:bg-dark-panel focus:outline-none focus:ring-1 focus:ring-accent-primary rounded"
                            aria-label="Glossary translation"
                        />
                      </td>
                      <td className="p-1">
                        <select
                            value={term.gender}
                            onChange={e => handleTermChange(term.reviewId, 'gender', e.target.value as Gender)}
                            className="w-full bg-transparent p-1 px-2 focus:bg-dark-panel focus:outline-none focus:ring-1 focus:ring-accent-primary rounded appearance-none"
                            aria-label={`Gender for ${term.input}`}
                        >
                          <option>Neutral</option><option>Male</option><option>Female</option>
                        </select>
                      </td>
                      <td className="p-1 text-center">
                        <button onClick={() => handleDeleteTerm(term.reviewId)} className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors" aria-label={`Delete term ${term.input}`}>
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary opacity-50">
               <p>No new terms detected.</p>
            </div>
          )}
      </div>

      <div className="mt-4 flex justify-end space-x-3">
        <button 
            onClick={onCancel} 
            className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-text-primary hover:bg-dark-sidebar transition-colors"
        >
          Cancel Batch Job
        </button>
        <button
          onClick={handleApply}
          className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-px transition-all duration-200"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Confirm & Continue</span>
        </button>
      </div>
    </div>
  );
};

export default InteractiveGlossaryApproval;
