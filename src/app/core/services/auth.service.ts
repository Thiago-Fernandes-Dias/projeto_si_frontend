import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthenticatedSession, BlockedAttempt } from '../models/user.model';
import { DebugLoggerService } from './debug-logger.service';

const SESSION_STORAGE_KEY = 'keystrokeAuthSession';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly debugLogger = inject(DebugLoggerService);
  private readonly session = signal<AuthenticatedSession | null>(this.restoreSession());
  private readonly lastBlockedAttempt = signal<BlockedAttempt | null>(null);

  readonly currentSession = computed(() => this.session());
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly blockedAttempt = computed(() => this.lastBlockedAttempt());

  startSession(session: AuthenticatedSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
    this.lastBlockedAttempt.set(null);
    this.debugLogger.debug('session', 'session_started', {
      username: session.username,
      confidenceScore: session.confidenceScore,
      hasToken: Boolean(session.accessToken)
    });
  }

  endSession(): void {
    const previousUser = this.session()?.username;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.session.set(null);
    this.debugLogger.debug('session', 'session_ended', {
      username: previousUser
    });
  }

  registerBlockedAttempt(attempt: BlockedAttempt): void {
    this.lastBlockedAttempt.set(attempt);
    this.debugLogger.debug('session', 'blocked_attempt_registered', {
      username: attempt.username,
      decision: attempt.result.decision,
      confidenceScore: attempt.result.confidenceScore,
      thresholdScore: attempt.result.thresholdScore
    });
  }

  clearBlockedAttempt(): void {
    this.lastBlockedAttempt.set(null);
    this.debugLogger.debug('session', 'blocked_attempt_cleared');
  }

  private restoreSession(): AuthenticatedSession | null {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    try {
      return stored ? (JSON.parse(stored) as AuthenticatedSession) : null;
    } catch {
      return null;
    }
  }
}
