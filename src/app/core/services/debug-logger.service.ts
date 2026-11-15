import { Injectable, inject } from '@angular/core';
import { RuntimeConfigService } from '../config/runtime-config.service';

export type DebugLogFlow = 'register' | 'enrollment' | 'login' | 'capture' | 'session' | 'http';

export type DebugLogPrimitive = string | number | boolean | null | undefined;
export type DebugLogValue = DebugLogPrimitive | readonly DebugLogPrimitive[] | Readonly<Record<string, DebugLogPrimitive>>;
export type DebugLogData = Readonly<Record<string, DebugLogValue>>;

export interface StructuredDebugLogEntry {
  readonly timestamp: string;
  readonly level: 'DEBUG';
  readonly service: 'projeto_si_frontend';
  readonly flow: DebugLogFlow;
  readonly event: string;
  readonly correlationId?: string;
  readonly data?: Record<string, unknown>;
}

const SENSITIVE_EXACT_KEYS = new Set([
  'password',
  'targetpassword',
  'confirmpassword',
  'passwordattempt',
  'senha',
  'senhahash',
  'secret',
  'token',
  'accesstoken',
  'authorization',
  'rawtimings',
  'textentered',
  'features'
]);

const SENSITIVE_SUBSTRINGS = ['secret', 'authorization', 'rawtimings', 'textentered', 'senhahash'] as const;

function isSensitiveLogKey(rawKey: string): boolean {
  const lowered = rawKey.toLowerCase();
  if (SENSITIVE_EXACT_KEYS.has(lowered)) {
    return true;
  }
  if (SENSITIVE_SUBSTRINGS.some((token) => lowered.includes(token))) {
    return true;
  }
  if (lowered.includes('password') && !lowered.endsWith('length')) {
    return true;
  }
  if (lowered.includes('token') && lowered !== 'hastoken' && lowered !== 'tokenissued') {
    return true;
  }
  return false;
}

export function createCorrelationId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeLogData(data: DebugLogData): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveLogKey(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogData(value as DebugLogData);
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

@Injectable({
  providedIn: 'root'
})
export class DebugLoggerService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private activeCorrelationId: string | null = null;

  get isEnabled(): boolean {
    return this.runtimeConfig.debugLogsEnabled();
  }

  get currentCorrelationId(): string | null {
    return this.activeCorrelationId;
  }

  newCorrelationId(): string {
    return createCorrelationId();
  }

  withCorrelation<T>(correlationId: string, fn: () => T): T {
    const previous = this.activeCorrelationId;
    this.activeCorrelationId = correlationId;
    try {
      return fn();
    } finally {
      this.activeCorrelationId = previous;
    }
  }

  debug(flow: DebugLogFlow, event: string, data?: DebugLogData, correlationId?: string): void {
    if (!this.isEnabled) {
      return;
    }

    const resolvedCorrelationId = correlationId ?? this.activeCorrelationId ?? undefined;
    const entry: StructuredDebugLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      service: 'projeto_si_frontend',
      flow,
      event,
      ...(resolvedCorrelationId ? { correlationId: resolvedCorrelationId } : {}),
      ...(data && Object.keys(data).length > 0 ? { data: sanitizeLogData(data) } : {})
    };

    console.debug('[SI-DEBUG]', JSON.stringify(entry));
  }
}
