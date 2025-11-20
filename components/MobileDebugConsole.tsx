"use client";

import { useEffect, useState } from 'react';

interface LogEntry {
  type: 'log' | 'error' | 'warn';
  message: string;
  timestamp: number;
}

export function MobileDebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    // Only show on mobile (Farcaster miniapp)
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    setIsVisible(true);

    // Intercept console.log
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args.join(' '));
    };

    // Intercept console.error
    const originalError = console.error;
    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '));
    };

    // Intercept console.warn
    const originalWarn = console.warn;
    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args.join(' '));
    };

    // Catch unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      addLog('error', `${event.message} at ${event.filename}:${event.lineno}`);
    };
    window.addEventListener('error', errorHandler);

    // Catch unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      addLog('error', `Unhandled Promise: ${event.reason}`);
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  const addLog = (type: 'log' | 'error' | 'warn', message: string) => {
    setLogs(prev => {
      const newLogs = [...prev, { type, message, timestamp: Date.now() }];
      // Keep only last 50 logs
      return newLogs.slice(-50);
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 text-white font-mono text-[10px] border-t-2 border-red-500"
      style={{
        maxHeight: isMinimized ? '40px' : '300px',
        transition: 'max-height 0.3s ease'
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center p-2 bg-red-900/50 cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <span className="text-red-400">🐛</span>
          <span className="font-bold">Debug Console</span>
          <span className="text-xs text-gray-400">({logs.length})</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-[9px]"
          >
            Clear
          </button>
          <span className="text-lg">{isMinimized ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Logs */}
      {!isMinimized && (
        <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: '260px' }}>
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No logs yet</div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`p-1 rounded ${
                  log.type === 'error'
                    ? 'bg-red-900/30 text-red-300'
                    : log.type === 'warn'
                    ? 'bg-yellow-900/30 text-yellow-300'
                    : 'bg-gray-800/30 text-gray-300'
                }`}
              >
                <div className="flex gap-2">
                  <span className="text-gray-500 text-[8px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`font-bold text-[8px] ${
                      log.type === 'error'
                        ? 'text-red-500'
                        : log.type === 'warn'
                        ? 'text-yellow-500'
                        : 'text-blue-500'
                    }`}
                  >
                    {log.type.toUpperCase()}
                  </span>
                </div>
                <div className="break-all">{log.message}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
