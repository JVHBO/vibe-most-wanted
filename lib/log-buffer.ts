/**
 * Global error log buffer for bug reports.
 * Captures unhandled errors and warnings passively.
 * Call initLogBuffer() once at app startup.
 */

export interface LogEntry {
  type: 'error' | 'warn' | 'unhandled';
  message: string;
  timestamp: string;
}

const MAX_ENTRIES = 30;
let logBuffer: LogEntry[] = [];
let initialized = false;

export function initLogBuffer() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: any[]) => {
    pushLog('error', args);
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    pushLog('warn', args);
    originalWarn(...args);
  };

  window.addEventListener('error', (e) => {
    pushLog('unhandled', [e.message, e.filename ? `@ ${e.filename}:${e.lineno}` : '']);
  });

  window.addEventListener('unhandledrejection', (e) => {
    pushLog('unhandled', ['UnhandledPromise:', String(e.reason)]);
  });
}

function pushLog(type: LogEntry['type'], args: any[]) {
  const message = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 0).slice(0, 200) : String(a)))
    .join(' ')
    .slice(0, 500);

  logBuffer.push({ type, message, timestamp: new Date().toISOString() });
  if (logBuffer.length > MAX_ENTRIES) logBuffer.shift();
}

export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogBuffer() {
  logBuffer = [];
}
