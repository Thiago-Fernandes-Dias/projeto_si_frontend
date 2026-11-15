import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiError, BiometricApiService } from './biometric-api.service';
import {
  AuthenticationPayload,
  KeystrokeSample,
  PasswordChangeRequest,
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
    expect(errorReceived).toBeInstanceOf(ApiError);
    expect((errorReceived as unknown as ApiError).status).toBe(409);
  });

  it('deve verificar a disponibilidade do username via GET', () => {
    let available: boolean | null = null;

    service.checkUsernameAvailability('thiago').subscribe((response) => {
      available = response.available;
    });

    const req = httpTestingController.expectOne(
      (request) =>
        request.url === '/api/username-availability' &&
        request.params.get('username') === 'thiago'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ username: 'thiago', available: true });

    expect(available).toBeTrue();
  });

  it('deve propagar erro ao falhar na verificação de disponibilidade', () => {
    let errorReceived: ApiError | null = null;

    service.checkUsernameAvailability('thiago').subscribe({
      next: () => fail('Não deveria ter sucesso'),
      error: (error: ApiError) => {
        errorReceived = error;
      }
    });

    httpTestingController
      .expectOne('/api/username-availability?username=thiago')
      .flush({ message: 'Servidor indisponível.' }, { status: 500, statusText: 'Server Error' });

    expect(errorReceived).toBeInstanceOf(ApiError);
    expect(errorReceived!.status).toBe(500);
    expect(errorReceived!.message).toBe('Servidor indisponível.');
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

  it('deve expor o status HTTP de erro do servidor no ApiError', () => {
    let errorReceived: ApiError | null = null;
    service.registerUser(criarRegistrationRequest(5)).subscribe({
      next: () => fail('Não deveria ter sucesso'),
      error: (error: ApiError) => {
        errorReceived = error;
      }
    });

    httpTestingController
      .expectOne('/api/register')
      .flush({ message: 'Erro ao processar amostras.' }, { status: 500, statusText: 'Server Error' });

    expect(errorReceived!.status).toBe(500);
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
    expect((errorReceived as unknown as ApiError).status).toBe(0);
  });

  describe('changePassword', () => {
    function criarPasswordChangeRequest(): PasswordChangeRequest {
      return {
        username: 'usuario_teste',
        currentPassword: 'senhaAtual123',
        newPassword: 'novaSenha456',
        samples: criarRegistrationRequest(5).samples.map((sample) => ({ ...sample, textEntered: 'novaSenha456' }))
      };
    }

    it('deve enviar usuário, senha atual, nova senha e as 5 amostras para POST /api/change-password', () => {
      const request = criarPasswordChangeRequest();

      service.changePassword(request).subscribe((response) => {
        expect(response.success).toBeTrue();
        expect(response.samplesRegistered).toBe(5);
      });

      const req = httpTestingController.expectOne('/api/change-password');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush({ success: true, message: 'Senha alterada.', samplesRegistered: 5, calculatedAverageHoldMs: 110 });
    });

    it('deve expor 404 no ApiError quando a rota de troca de senha não existir', () => {
      let errorReceived: ApiError | null = null;
      service.changePassword(criarPasswordChangeRequest()).subscribe({
        next: () => fail('Não deveria ter sucesso'),
        error: (error: ApiError) => {
          errorReceived = error;
        }
      });

      httpTestingController.expectOne('/api/change-password').flush('', { status: 404, statusText: 'Not Found' });

      expect(errorReceived).toBeInstanceOf(ApiError);
      expect(errorReceived!.status).toBe(404);
    });

    it('deve expor 401 com a mensagem do backend quando a senha atual estiver incorreta', () => {
      let errorReceived: ApiError | null = null;
      service.changePassword(criarPasswordChangeRequest()).subscribe({
        next: () => fail('Não deveria ter sucesso'),
        error: (error: ApiError) => {
          errorReceived = error;
        }
      });

      httpTestingController
        .expectOne('/api/change-password')
        .flush({ success: false, message: 'Usuário ou senha atual incorretos.' }, { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived!.status).toBe(401);
      expect(errorReceived!.message).toBe('Usuário ou senha atual incorretos.');
    });
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
