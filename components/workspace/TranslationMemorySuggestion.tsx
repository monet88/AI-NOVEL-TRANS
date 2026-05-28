import React from 'react';
import StarIcon from '../icons/StarIcon';
import WandIcon from '../icons/WandIcon';

interface TranslationMemorySuggestionProps {
  suggestion: string;
  onAccept: () => void;
  onForceTranslate: () => void;
}

const TranslationMemorySuggestion: React.FC<TranslationMemorySuggestionProps> = ({ suggestion, onAccept, onForceTranslate }) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-dark-sidebar border-b border-accent-secondary/50 p-2 animate-fade-in shadow-lg">
      <div className="flex items-center justify-between max-w-full">
        <div className="flex items-center space-x-3 flex-grow min-w-0">
          <StarIcon className="w-5 h-5 text-accent-secondary flex-shrink-0" />
          <div className="text-sm min-w-0">
            <span className="font-semibold text-text-primary">TM Match Found:</span>
            <p className="text-text-secondary truncate" title={suggestion}>
              {suggestion}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
          <button
            onClick={onAccept}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-success text-white hover:bg-opacity-80 transition-colors"
          >
            Accept Suggestion
          </button>
          <button
            onClick={onForceTranslate}
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-dark-hover text-text-secondary hover:bg-dark-input transition-colors flex items-center space-x-1.5"
          >
            <WandIcon className="w-4 h-4"/>
            <span>Translate with AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationMemorySuggestion;