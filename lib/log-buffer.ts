/**
 * Global error log buffer for bug reports.
 * Captures unhandled errors and warnings passively.
 * Call initLogBuffer() once at app startup.
 */

export interface LogEntry {
  type: 'error' | 'warn' | 'unhandled' | 'app';
  message: string;
  timestamp: string;
  context?: string;
  stack?: string;
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
    pushLog('unhandled', [e.message, e.filename ? `@ ${e.filename}:${e.lineno}` : ''], undefined, e.error?.stack);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    pushLog('unhandled', ['UnhandledPromise:', msg], undefined, stack);
  });
}

function pushLog(type: LogEntry['type'], args: any[], context?: string, stack?: string) {
  const message = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 0).slice(0, 200) : String(a)))
    .join(' ')
    .slice(0, 500);

  logBuffer.push({
    type, message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
    ...(stack ? { stack: stack.slice(0, 400) } : {}),
  });
  if (logBuffer.length > MAX_ENTRIES) logBuffer.shift();
}

/** Registra erro de app com contexto (ex: "account_creation") */
export function logAppError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  pushLog('app', [message], context, stack);
}

export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogBuffer() {
  logBuffer = [];
}
