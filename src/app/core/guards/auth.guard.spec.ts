import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';
import { Observable } from 'rxjs';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { AuthenticatedSession } from '../models/user.model';

describe('authGuard', () => {
  const session = signal<AuthenticatedSession | null>(null);
  const endSession = jasmine.createSpy('endSession').and.callFake(() => session.set(null));
  const authServiceStub = {
    currentSession: session,
    endSession
  };
  let httpTestingController: HttpTestingController;

  function executeGuard(): MaybeAsync<GuardResult> {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    session.set(null);
    endSession.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceStub }
      ]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should allow access when the backend confirms the token', () => {
    session.set({
      username: 'ana',
      confidenceScore: 0.9,
      authenticatedAt: '2026-11-15T12:00:00Z',
      accessToken: 'token-atual'
    });

    let result: GuardResult | undefined;
    (executeGuard() as Observable<GuardResult>).subscribe((value) => (result = value));

    const request = httpTestingController.expectOne('/api/session');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-atual');
    request.flush({ username: 'ana' });

    expect(result).toBeTrue();
  });

  it('should redirect to /login when there is no active session', () => {
    const result = executeGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('should clear the session and redirect when the token was invalidated', () => {
    session.set({
      username: 'ana',
      confidenceScore: 0.9,
      authenticatedAt: '2026-11-15T12:00:00Z',
      accessToken: 'token-antigo'
    });

    let result: GuardResult | undefined;
    (executeGuard() as Observable<GuardResult>).subscribe((value) => (result = value));

    httpTestingController
      .expectOne('/api/session')
      .flush({ message: 'Sessão inválida.' }, { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
    expect(endSession).toHaveBeenCalled();
  });
});
