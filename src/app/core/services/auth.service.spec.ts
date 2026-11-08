import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { AuthenticatedSession, BlockedAttempt } from '../models/user.model';

const SESSION_STORAGE_KEY = 'keystrokeAuthSession';

describe('AuthService', () => {
  const genuineSession: AuthenticatedSession = {
    username: 's002_cmu',
    confidenceScore: 0.93,
    authenticatedAt: '2026-11-07T21:30:00.000Z'
  };

  function createService(): AuthService {
    TestBed.configureTestingModule({});
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('should start without a session when storage is empty', () => {
    const service = createService();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentSession()).toBeNull();
  });

  it('should register and persist the session on startSession', () => {
    const service = createService();

    service.startSession(genuineSession);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentSession()).toEqual(genuineSession);
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')).toEqual(genuineSession);
  });

  it('should clear the session and storage on endSession', () => {
    const service = createService();
    service.startSession(genuineSession);

    service.endSession();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('should restore a session previously saved in storage', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(genuineSession));

    const service = createService();

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentSession()).toEqual(genuineSession);
  });

  it('should ignore corrupted data in storage', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{not-json');

    const service = createService();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentSession()).toBeNull();
  });

  describe('blocked attempt', () => {
    const blockedAttempt: BlockedAttempt = {
      username: 's002_cmu',
      result: {
        decision: 'IMPOSTOR',
        confidenceScore: 0.336,
        thresholdScore: 0.75,
        inferenceTimeMs: 12.8,
        message: 'Acesso bloqueado.',
        attemptAverageHoldTimeMs: 207
      }
    };

    it('should start without a blocked attempt', () => {
      expect(createService().blockedAttempt()).toBeNull();
    });

    it('should register and clear a blocked attempt without touching storage', () => {
      const service = createService();

      service.registerBlockedAttempt(blockedAttempt);
      expect(service.blockedAttempt()).toEqual(blockedAttempt);
      expect(service.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();

      service.clearBlockedAttempt();
      expect(service.blockedAttempt()).toBeNull();
    });

    it('should discard the blocked attempt when a session starts', () => {
      const service = createService();
      service.registerBlockedAttempt(blockedAttempt);

      service.startSession(genuineSession);

      expect(service.blockedAttempt()).toBeNull();
    });
  });
});
