import React, { useRef, useEffect } from 'react';
import TrashIcon from '../icons/TrashIcon';
import type { LogEntry } from '../../hooks/useLogs';

interface TranslationLogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

const TranslationLogPanel: React.FC<TranslationLogPanelProps> = ({ logs, onClear }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the bottom when new logs are added
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-48 bg-dark-sidebar border-t-2 border-border-color flex flex-col animate-fade-in">
      <header className="flex-shrink-0 p-2 border-b border-border-color flex justify-between items-center">
        <h3 className="text-sm font-semibold text-text-primary">Translation Log</h3>
        <button
          onClick={onClear}
          className="p-1.5 rounded-md hover:bg-dark-hover text-text-secondary hover:text-danger"
          title="Clear Logs"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </header>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto p-2 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-text-secondary">No logs yet. Start a translation to see details here.</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex space-x-2">
              <span className="text-text-secondary flex-shrink-0">{log.timestamp}</span>
              <span className="text-text-primary whitespace-pre-wrap">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TranslationLogPanel;