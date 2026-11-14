import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { Router, provideRouter } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';
import { AuthenticationResponse, KeystrokeSample } from '../../core/models/keystroke.model';

const SESSION_STORAGE_KEY = 'keystrokeAuthSession';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let userSession: UserSessionService;
  let captureService: KeystrokeCaptureService;
  let authService: AuthService;
  let router: Router;
  let biometricApiSpy: jasmine.SpyObj<BiometricApiService>;

  const capturedSample: KeystrokeSample = {
    repetition: 1,
    textEntered: '.tie5Roanl',
    features: { 'H.period': 0.14 },
    rawTimings: [{ key: '.', code: 'Period', timestamp: 100, eventType: 'KEY_DOWN' }],
    totalDurationMs: 140
  };

  function buildResponse(decision: AuthenticationResponse['decision'], confidenceScore: number): AuthenticationResponse {
    return {
      decision,
      confidenceScore,
      thresholdScore: 0.75,
      inferenceTimeMs: 15,
      message: decision === 'GENUINE' ? 'Acesso Permitido' : 'Acesso Bloqueado'
    };
  }

  beforeEach(async () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    biometricApiSpy = jasmine.createSpyObj('BiometricApiService', ['authenticate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: BiometricApiService, useValue: biometricApiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    userSession = TestBed.inject(UserSessionService);
    captureService = TestBed.inject(KeystrokeCaptureService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    userSession.registerUser('usuario_teste', '.tie5Roanl');
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('deve criar o componente de login', () => {
    expect(component).toBeTruthy();
    expect(component.username).toBe('usuario_teste');
  });

  it('deve exibir o nome do sistema no painel azul', () => {
    const panel = (fixture.nativeElement as HTMLElement).querySelector('.toggle-panel');
    expect(panel?.querySelector('h1')?.textContent).toContain('Keystroke Dynamics Biometrics');
  });

  it('deve marcar INVALID_CREDENTIALS quando nenhuma tecla foi capturada ou a senha for incorreta', () => {
    component.onPasswordSubmitted('senha_errada');

    expect(component.authResult).not.toBeNull();
    expect(component.authResult?.decision).toBe('INVALID_CREDENTIALS');
    expect(authService.isAuthenticated()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve consultar o backend mesmo para senhas diferentes da sessão local e exibir INVALID_CREDENTIALS retornado pela API', () => {
    const invalidResponse: AuthenticationResponse = {
      decision: 'INVALID_CREDENTIALS',
      confidenceScore: 0,
      thresholdScore: 0.75,
      inferenceTimeMs: 0,
      message: 'Usuário ou senha incorretos.',
      userAverageHoldTimeMs: 0,
      attemptAverageHoldTimeMs: 110,
      accessToken: null,
      accessTokenExpiresAt: null
    };
    biometricApiSpy.authenticate.and.returnValue(of(invalidResponse));
    spyOn(captureService, 'computeSample').and.returnValue({
      ...capturedSample,
      textEntered: 'outra_senha123'
    });

    component.onPasswordSubmitted('outra_senha123');

    expect(captureService.computeSample).toHaveBeenCalledWith(1);
    expect(biometricApiSpy.authenticate).toHaveBeenCalledWith(
      jasmine.objectContaining({
        username: 'usuario_teste',
        passwordAttempt: 'outra_senha123'
      })
    );
    expect(component.authResult?.decision).toBe('INVALID_CREDENTIALS');
    expect(component.authResult?.message).toBe('Usuário ou senha incorretos.');
    expect(authService.isAuthenticated()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve chamar API e exibir resultado GENUINE quando autenticado com sucesso', () => {
    const mockAuthResponse: AuthenticationResponse = {
      decision: 'GENUINE',
      confidenceScore: 0.94,
      thresholdScore: 0.75,
      inferenceTimeMs: 15,
      message: 'Acesso Permitido',
      accessToken: 'jwt-token-123',
      accessTokenExpiresAt: '2026-11-14T18:00:00Z'
    };
    biometricApiSpy.authenticate.and.returnValue(of(mockAuthResponse));

    spyOn(captureService, 'computeSample').and.returnValue({
      repetition: 1,
      textEntered: '.tie5Roanl',
      features: { 'H.period': 0.14 },
      rawTimings: [
        { key: '.', code: 'Period', timestamp: 100, eventType: 'KEY_DOWN' },
        { key: '.', code: 'Period', timestamp: 240, eventType: 'KEY_UP' }
      ],
      totalDurationMs: 140
    });

    component.onPasswordSubmitted('.tie5Roanl');

    expect(biometricApiSpy.authenticate).toHaveBeenCalled();
    expect(component.authResult?.decision).toBe('GENUINE');
    expect(component.authResult?.confidenceScore).toBe(0.94);
    expect(authService.isAuthenticated()).toBeTrue();
    expect(authService.currentSession()?.username).toBe('usuario_teste');
    expect(authService.currentSession()?.confidenceScore).toBe(0.94);
    expect(authService.currentSession()?.accessToken).toBe('jwt-token-123');
    expect(authService.currentSession()?.accessTokenExpiresAt).toBe('2026-11-14T18:00:00Z');
    expect(router.navigate).toHaveBeenCalledWith(['/session']);
  });

  it('deve registrar a tentativa bloqueada e navegar para /blocked quando a decisão for IMPOSTOR', () => {
    const impostorResponse = buildResponse('IMPOSTOR', 0.42);
    biometricApiSpy.authenticate.and.returnValue(of(impostorResponse));
    spyOn(captureService, 'computeSample').and.returnValue(capturedSample);

    component.onPasswordSubmitted('.tie5Roanl');

    expect(component.authResult?.decision).toBe('IMPOSTOR');
    expect(authService.isAuthenticated()).toBeFalse();
    expect(authService.blockedAttempt()).toEqual({ username: 'usuario_teste', result: impostorResponse });
    expect(router.navigate).toHaveBeenCalledWith(['/blocked']);
  });

  it('não deve registrar tentativa bloqueada quando a decisão for GENUINE', () => {
    biometricApiSpy.authenticate.and.returnValue(of(buildResponse('GENUINE', 0.94)));
    spyOn(captureService, 'computeSample').and.returnValue(capturedSample);

    component.onPasswordSubmitted('.tie5Roanl');

    expect(authService.blockedAttempt()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalledWith(['/blocked']);
  });

  it('deve exibir mensagem de erro caso ocorra falha na API ou indisponibilidade', () => {
    biometricApiSpy.authenticate.and.returnValue(
      throwError(() => new Error('Não foi possível conectar ao servidor. Verifique se a API está em execução.'))
    );
    spyOn(captureService, 'computeSample').and.returnValue(capturedSample);

    component.onPasswordSubmitted('.tie5Roanl');

    expect(component.isAuthenticating).toBeFalse();
    expect(component.errorMessage).toContain('Não foi possível conectar ao servidor');
    expect(authService.isAuthenticated()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
