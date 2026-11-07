import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BiometricApiService } from './biometric-api.service';
import { AuthenticationPayload, EnrollmentPayload } from '../models/keystroke.model';

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

  it('deve realizar autenticação e retornar decisão biométrica', () => {
    const authPayload: AuthenticationPayload = {
      username: 'usuario_teste',
      passwordAttempt: 'senha123',
      selectedAlgorithm: 'RANDOM_FOREST_HPO',
      sample: {
        repetition: 1,
        textEntered: 'senha123',
        features: {},
        rawTimings: [
          { key: 's', code: 'KeyS', pressTime: 100, releaseTime: 200 }
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
      algorithm: 'RANDOM_FOREST_HPO',
      inferenceTimeMs: 12,
      message: 'Acesso Permitido'
    });
  });

  it('deve usar fallback de simulação local quando a API estiver inacessível', () => {
    const authPayload: AuthenticationPayload = {
      username: 'usuario_teste',
      passwordAttempt: 'senha123',
      selectedAlgorithm: 'KNN_HPO',
      sample: {
        repetition: 1,
        textEntered: 'senha123',
        features: {},
        rawTimings: [
          { key: 'a', code: 'KeyA', pressTime: 100, releaseTime: 220 }
        ],
        totalDurationMs: 120
      }
    };

    service.authenticate(authPayload).subscribe((response) => {
      expect(response).toBeDefined();
      expect(['GENUINE', 'IMPOSTOR']).toContain(response.decision);
    });

    const req = httpTestingController.expectOne('/api/authenticate');
    req.error(new ProgressEvent('Network error'));
  });
});
