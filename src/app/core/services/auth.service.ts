import { Injectable, computed, signal } from '@angular/core';
import { AuthenticatedSession, BlockedAttempt } from '../models/user.model';

const SESSION_STORAGE_KEY = 'keystrokeAuthSession';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly session = signal<AuthenticatedSession | null>(this.restoreSession());
  private readonly lastBlockedAttempt = signal<BlockedAttempt | null>(null);

  readonly currentSession = computed(() => this.session());
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly blockedAttempt = computed(() => this.lastBlockedAttempt());

  startSession(session: AuthenticatedSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
    this.lastBlockedAttempt.set(null);
  }

  endSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.session.set(null);
  }

  registerBlockedAttempt(attempt: BlockedAttempt): void {
    this.lastBlockedAttempt.set(attempt);
  }

  clearBlockedAttempt(): void {
    this.lastBlockedAttempt.set(null);
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
