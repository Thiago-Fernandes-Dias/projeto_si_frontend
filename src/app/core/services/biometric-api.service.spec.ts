import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BiometricApiService } from './biometric-api.service';
import {
  AuthenticationPayload,
  KeystrokeSample,
  RegistrationRequest
} from '../models/keystroke.model';

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

  it('deve cadastrar usuário e amostras no endpoint único', () => {
    const request = criarRegistrationRequest(5);

    service.registerUser(request).subscribe((response) => {
      expect(response.success).toBeTrue();
      expect(response.message).toBe('Usuário e amostras registrados com sucesso.');
      expect(response.samplesRegistered).toBe(5);
      expect(response.calculatedAverageHoldMs).toBe(110.5);
    });

    const req = httpTestingController.expectOne('/api/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.body.samples.length).toBe(5);
    req.flush({
      success: true,
      message: 'Usuário e amostras registrados com sucesso.',
      samplesRegistered: 5,
      calculatedAverageHoldMs: 110.5
    });
  });

  it('deve propagar erro ao falhar no cadastro de usuário em vez de retornar resposta pronta', () => {
    const request = criarRegistrationRequest(5);

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

  it('deve preservar rawTimings com timestamp e eventType (KEY_DOWN/KEY_UP) no cadastro', () => {
    const request = criarRegistrationRequest(1);
    request.samples[0] = {
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
    };

    service.registerUser(request).subscribe((response) => {
      expect(response.success).toBeTrue();
    });

    const req = httpTestingController.expectOne('/api/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.body.samples[0].rawTimings).toEqual([
      { key: 'a', code: 'KeyA', timestamp: 1000, eventType: 'KEY_DOWN' },
      { key: 'a', code: 'KeyA', timestamp: 1100, eventType: 'KEY_UP' },
      { key: 'b', code: 'KeyB', timestamp: 1250, eventType: 'KEY_DOWN' },
      { key: 'b', code: 'KeyB', timestamp: 1370, eventType: 'KEY_UP' }
    ]);
    req.flush({
      success: true,
      message: 'Cadastro registrado.',
      samplesRegistered: 1,
      calculatedAverageHoldMs: 110
    });
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

  function criarRegistrationRequest(quantidadeAmostras: number): RegistrationRequest {
    const samples: KeystrokeSample[] = Array.from({ length: quantidadeAmostras }, (_, indice) => ({
      repetition: indice + 1,
      textEntered: 'senha123',
      features: { 'H.s.0': 0.1 },
      rawTimings: [],
      totalDurationMs: 1200
    }));

    return {
      username: 'usuario_teste',
      password: 'senha123',
      samples
    };
  }
});
