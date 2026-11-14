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
    });

    const req = httpTestingController.expectOne('/api/enrollment');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, message: 'Sucesso', samplesRegistered: 5 });
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

  it('deve realizar autenticação e retornar decisão biométrica', () => {
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
    });

    const req = httpTestingController.expectOne('/api/authenticate');
    expect(req.request.method).toBe('POST');
    req.flush({
      decision: 'GENUINE',
      confidenceScore: 0.95,
      thresholdScore: 0.75,
      inferenceTimeMs: 12,
      message: 'Acesso Permitido'
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
