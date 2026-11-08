import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SessionComponent } from './session.component';
import { AuthService } from '../../core/services/auth.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { AuthenticatedSession } from '../../core/models/user.model';

describe('SessionComponent', () => {
  let fixture: ComponentFixture<SessionComponent>;
  let element: HTMLElement;
  let router: Router;

  const currentSession = signal<AuthenticatedSession | null>(null);
  const endSession = jasmine.createSpy('endSession');
  const authServiceStub: Pick<AuthService, 'currentSession' | 'endSession'> = {
    currentSession,
    endSession
  };

  const genuineSession: AuthenticatedSession = {
    username: 's002_cmu',
    confidenceScore: 0.934,
    authenticatedAt: new Date(2026, 10, 7, 21, 30).toISOString()
  };

  beforeEach(async () => {
    currentSession.set(genuineSession);
    endSession.calls.reset();

    await TestBed.configureTestingModule({
      imports: [SessionComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceStub }]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(SessionComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should render the authenticated session details', () => {
    const text = element.textContent ?? '';

    expect(text).toContain('s002_cmu');
    expect(text).toContain('93.4%');
    expect(text).toContain('07/11/2026 21:30');
  });

  it('should place the blue panel on the right so it slides in after the login', () => {
    const container = element.querySelector('.container') as HTMLElement;

    expect(container.classList).not.toContain('panel-left');
    expect(container.classList).not.toContain('static');
  });

  it('should hide session details when there is no session', () => {
    currentSession.set(null);
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Usuário:');
    expect(element.querySelector('button')).not.toBeNull();
  });

  it('should end the session and navigate to /login on logout', () => {
    const logoutButton = element.querySelector('button') as HTMLButtonElement;

    logoutButton.click();

    expect(endSession).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should erase the typed password and stop the capture on logout', () => {
    const captureService = TestBed.inject(KeystrokeCaptureService);
    captureService.startRecording();
    captureService.currentText.set('.tie5Roanl');
    const logoutButton = element.querySelector('button') as HTMLButtonElement;

    logoutButton.click();

    expect(captureService.currentText()).toBe('');
    expect(captureService.isRecording()).toBeFalse();
    expect(captureService.getCompletedKeys()).toEqual([]);
  });
});
