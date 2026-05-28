
import { useState, useCallback } from 'react';

export interface LogEntry {
  timestamp: string;
  message: string;
}

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    setLogs(prev => [...prev, { timestamp, message }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog("Logs cleared.");
  }, [addLog]);

  return { logs, addLog, clearLogs };
};
