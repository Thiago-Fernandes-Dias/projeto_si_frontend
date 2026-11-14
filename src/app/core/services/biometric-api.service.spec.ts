import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BiometricApiService } from './biometric-api.service';
import { AuthenticationPayload, EnrollmentPayload } from '../models/keystroke.model';
import { RegistrationRequest } from '../models/user.model';

describe('BiometricApiService', () => {
  let service: BiometricApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(BiometricApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve registrar usuário com sucesso via API', () => {
    const request: RegistrationRequest = {
      username: 'usuario_teste',
      targetPassword: 'password123',
      confirmPassword: 'password123'
    };

    service.registerUser(request).subscribe((response) => {
      expect(response.success).toBeTrue();
      expect(response.message).toBe('Usuário registrado com sucesso.');
    });

    const req = httpTestingController.expectOne('/api/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ success: true, message: 'Usuário registrado com sucesso.' });
  });

  it('deve propagar erro ao falhar no registro de usuário em vez de retornar resposta pronta', () => {
    const request: RegistrationRequest = {
      username: 'usuario_teste',
      targetPassword: 'password123',
      confirmPassword: 'password123'
    };

    let errorReceived: Error | null = null;
    service.registerUser(request).subscribe({
      next: () => fail('Não deveria ter sucesso'),
      error: (error) => {
        errorReceived = error;
      }
    });

    const req = httpTestingController.expectOne('/api/register');
    req.flush({ message: 'Nome de usuário já existe.' }, { status: 409, statusText: 'Conflict' });

    expect(errorReceived).not.toBeNull();
    expect(errorReceived!.message).toBe('Nome de usuário já existe.');
  });

  it('deve submeter o lote de enrollment para a API', () => {
    const payload: EnrollmentPayload = {
      username: 'usuario_teste',
      passwordLength: 5,
      samplesCount: 5,
      samples: []
    };

    service.submitEnrollment(payload).subscribe((response) => {
      expect(response.success).toBeTrue();
      expect(response.samplesRegistered).toBe(5);
      expect(response.calculatedAverageHoldMs).toBe(110.5);
    });

    const req = httpTestingController.expectOne('/api/enrollment');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      success: true,
      message: 'Sucesso',
      samplesRegistered: 5,
      calculatedAverageHoldMs: 110.5
    });
  });

  it('deve preservar rawTimings com timestamp e eventType (KEY_DOWN/KEY_UP) no enrollment', () => {
    const payload: EnrollmentPayload = {
      username: 'usuario_teste',
      passwordLength: 2,
      samplesCount: 1,
      samples: [
        {
          repetition: 1,
          textEntered: 'ab',
          features: { 'H.a.0': 0.1, 'DD.a.b.0': 0.25, 'UD.a.b.0': 0.15, 'H.b.0': 0.12 },
          rawTimings: [
            { key: 'a', code: 'KeyA', timestamp: 1000, eventType: 'KEY_DOWN' },
            { key: 'a', code: 'KeyA', timestamp: 1100, eventType: 'KEY_UP' },
            { key: 'b', code: 'KeyB', timestamp: 1250, eventType: 'KEY_DOWN' },
            { key: 'b', code: 'KeyB', timestamp: 1370, eventType: 'KEY_UP' }
          ],
          totalDurationMs: 370
        }
      ]
    };

    service.submitEnrollment(payload).subscribe((response) => {
      expect(response.success).toBeTrue();
    });

    const req = httpTestingController.expectOne('/api/enrollment');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.body.samples[0].rawTimings).toEqual([
      { key: 'a', code: 'KeyA', timestamp: 1000, eventType: 'KEY_DOWN' },
      { key: 'a', code: 'KeyA', timestamp: 1100, eventType: 'KEY_UP' },
      { key: 'b', code: 'KeyB', timestamp: 1250, eventType: 'KEY_DOWN' },
      { key: 'b', code: 'KeyB', timestamp: 1370, eventType: 'KEY_UP' }
    ]);
    req.flush({
      success: true,
      message: 'Lote registrado.',
      samplesRegistered: 1,
      calculatedAverageHoldMs: 110
    });
  });

  it('deve propagar erro ao falhar na submissão de enrollment em vez de retornar resposta pronta', () => {
    const payload: EnrollmentPayload = {
      username: 'usuario_teste',
      passwordLength: 5,
      samplesCount: 5,
      samples: []
    };

    let errorReceived: Error | null = null;
    service.submitEnrollment(payload).subscribe({
      next: () => fail('Não deveria ter sucesso'),
      error: (error) => {
        errorReceived = error;
      }
    });

    const req = httpTestingController.expectOne('/api/enrollment');
    req.flush({ message: 'Erro ao processar amostras.' }, { status: 500, statusText: 'Server Error' });

    expect(errorReceived).not.toBeNull();
    expect(errorReceived!.message).toBe('Erro ao processar amostras.');
  });

  it('deve realizar autenticação preservando rawTimings com timestamps e retornar decisão biométrica com token', () => {
    const authPayload: AuthenticationPayload = {
      username: 'usuario_teste',
      passwordAttempt: 'senha123',
      sample: {
        repetition: 1,
        textEntered: 'senha123',
        features: { 'H.s.0': 0.1 },
        rawTimings: [
          { key: 's', code: 'KeyS', timestamp: 100, eventType: 'KEY_DOWN' },
          { key: 's', code: 'KeyS', timestamp: 200, eventType: 'KEY_UP' }
        ],
        totalDurationMs: 100
      }
    };

    service.authenticate(authPayload).subscribe((response) => {
      expect(response.decision).toBe('GENUINE');
      expect(response.confidenceScore).toBe(0.95);
      expect(response.accessToken).toBe('jwt-token');
      expect(response.accessTokenExpiresAt).toBe('2026-11-14T18:00:00Z');
    });

    const req = httpTestingController.expectOne('/api/authenticate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(authPayload);
    expect(req.request.body.sample.rawTimings).toEqual([
      { key: 's', code: 'KeyS', timestamp: 100, eventType: 'KEY_DOWN' },
      { key: 's', code: 'KeyS', timestamp: 200, eventType: 'KEY_UP' }
    ]);
    req.flush({
      decision: 'GENUINE',
      confidenceScore: 0.95,
      thresholdScore: 0.75,
      inferenceTimeMs: 12,
      message: 'Acesso Permitido',
      userAverageHoldTimeMs: 100,
      attemptAverageHoldTimeMs: 100,
      accessToken: 'jwt-token',
      accessTokenExpiresAt: '2026-11-14T18:00:00Z'
    });
  });

  it('deve consultar o endpoint de saúde /api/health', () => {
    service.checkHealth().subscribe((response) => {
      expect(response.status).toBe('healthy');
      expect(response.service).toBe('Keystroke Dynamics Biometrics API');
    });

    const req = httpTestingController.expectOne('/api/health');
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'healthy',
      service: 'Keystroke Dynamics Biometrics API',
      timestamp: '2026-11-14T16:00:00Z'
    });
  });

  it('deve propagar erro de conexão quando a API estiver inacessível em vez de retornar simulação local', () => {
    const authPayload: AuthenticationPayload = {
      username: 'usuario_teste',
      passwordAttempt: 'senha123',
      sample: {
        repetition: 1,
        textEntered: 'senha123',
        features: { 'H.a.0': 0.12 },
        rawTimings: [
          { key: 'a', code: 'KeyA', timestamp: 100, eventType: 'KEY_DOWN' },
          { key: 'a', code: 'KeyA', timestamp: 220, eventType: 'KEY_UP' }
        ],
        totalDurationMs: 120
      }
    };

    let errorReceived: Error | null = null;
    service.authenticate(authPayload).subscribe({
      next: () => fail('Não deveria ter sucesso quando API está inacessível'),
      error: (error) => {
        errorReceived = error;
      }
    });

    const req = httpTestingController.expectOne('/api/authenticate');
    req.error(new ProgressEvent('Network error'));

    expect(errorReceived).not.toBeNull();
    expect(errorReceived!.message).toContain('Não foi possível conectar ao servidor');
  });
});
