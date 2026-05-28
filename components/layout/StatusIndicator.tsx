
import React from 'react';
import { ChapterStatus } from '../../services/batchOrchestrator';

interface StatusIndicatorProps {
  status: ChapterStatus;
}

const getStatusIndicatorContent = (status: ChapterStatus) => {
    switch (status) {
        case ChapterStatus.Pending: return <div className="w-3 h-3 rounded-full bg-gray-500" title="Pending"></div>;
        case ChapterStatus.InProgress: return <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" title="In Progress..."></div>;
        case ChapterStatus.GlossaryReview: return <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" title="Reviewing Terms..."></div>;
        case ChapterStatus.Translating: return <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" title="Translating..."></div>;
        case ChapterStatus.Completed: return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-success"><title>Completed</title><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4.25-5.832Z" clipRule="evenodd" /></svg>;
        case ChapterStatus.Failed: return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger"><title>Failed</title><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" /></svg>;
        default: return null;
    }
};

const StatusIndicator: React.FC<StatusIndicatorProps> = React.memo(({ status }) => {
    return (
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {getStatusIndicatorContent(status)}
        </div>
    );
});

export default StatusIndicator;
