import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { SessionComponent } from './features/session/session.component';

const SESSION_STORAGE_KEY = 'keystrokeAuthSession';

describe('app routes', () => {
  beforeEach(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    });
  });

  afterEach(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('should redirect /session to /login when there is no active session', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/session');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('should open /session when there is an active session', async () => {
    TestBed.inject(AuthService).startSession({
      username: 's002_cmu',
      confidenceScore: 0.93,
      authenticatedAt: '2026-11-07T21:30:00.000Z'
    });
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/session', SessionComponent);

    expect(TestBed.inject(Router).url).toBe('/session');
    expect(component).toBeInstanceOf(SessionComponent);
  });
});
