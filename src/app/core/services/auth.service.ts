import { Injectable, computed, signal } from '@angular/core';
import { AuthenticatedSession } from '../models/user.model';

const SESSION_STORAGE_KEY = 'keystrokeAuthSession';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly session = signal<AuthenticatedSession | null>(this.restoreSession());

  readonly currentSession = computed(() => this.session());
  readonly isAuthenticated = computed(() => this.session() !== null);

  startSession(session: AuthenticatedSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  endSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.session.set(null);
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
