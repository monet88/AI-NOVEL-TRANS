
import React from 'react';
import { BatchChapter } from '../../services/batchOrchestrator';
import StatusIndicator from '../layout/StatusIndicator';

interface BatchChapterRowProps {
    chapter: BatchChapter;
    isSelected: boolean;
    onToggleSelection: (chapterId: string) => void;
    isInteractive: boolean;
    showCheckbox: boolean;
}

const areEqual = (prevProps: BatchChapterRowProps, nextProps: BatchChapterRowProps) => {
    // Only re-render if the chapter's status or its selection state changes.
    // This prevents re-rendering the entire list when only one item changes.
    return (
        prevProps.chapter.status === nextProps.chapter.status &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isInteractive === nextProps.isInteractive &&
        prevProps.chapter.id === nextProps.chapter.id
    );
};

const BatchChapterRow: React.FC<BatchChapterRowProps> = React.memo(({
    chapter,
    isSelected,
    onToggleSelection,
    isInteractive,
    showCheckbox,
}) => {
    const hasContent = chapter.sourceText && chapter.sourceText.trim() !== '';

    return (
        <li className="flex items-center justify-between p-3 bg-dark-input rounded-md">
            <div className="flex items-center space-x-3 flex-grow truncate">
                {showCheckbox && (
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection(chapter.id)}
                        className="h-4 w-4 rounded-md bg-dark-hover border-border-color text-accent-primary focus:ring-accent-primary disabled:opacity-50"
                        disabled={!isInteractive || !hasContent}
                        aria-label={`Select chapter ${chapter.name}`}
                    />
                )}
                <span className={`text-text-primary truncate ${!hasContent ? 'text-opacity-50' : ''}`} title={chapter.name}>
                    {chapter.name}
                </span>
            </div>
            <StatusIndicator status={chapter.status} />
        </li>
    );
}, areEqual);

export default BatchChapterRow;
