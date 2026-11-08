import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';

import { blockedAttemptGuard } from './blocked-attempt.guard';
import { AuthService } from '../services/auth.service';

describe('blockedAttemptGuard', () => {
  function executeGuard(): MaybeAsync<GuardResult> {
    return TestBed.runInInjectionContext(() =>
      blockedAttemptGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('deve liberar /blocked quando há uma tentativa bloqueada registrada', () => {
    TestBed.inject(AuthService).registerBlockedAttempt({
      username: 's002_cmu',
      result: {
        decision: 'IMPOSTOR',
        confidenceScore: 0.336,
        thresholdScore: 0.75,
        inferenceTimeMs: 12.8,
        message: 'Acesso bloqueado.'
      }
    });

    expect(executeGuard()).toBeTrue();
  });

  it('deve mandar para /login quando não há tentativa bloqueada', () => {
    const result = executeGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
