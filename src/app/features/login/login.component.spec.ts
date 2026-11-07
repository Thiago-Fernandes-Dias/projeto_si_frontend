import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { provideRouter } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { of } from 'rxjs';
import { AuthenticationResponse } from '../../core/models/keystroke.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let userSession: UserSessionService;
  let captureService: KeystrokeCaptureService;
  let biometricApiSpy: jasmine.SpyObj<BiometricApiService>;

  beforeEach(async () => {
    biometricApiSpy = jasmine.createSpyObj('BiometricApiService', [
      'getAvailableAlgorithms',
      'authenticate'
    ]);
    biometricApiSpy.getAvailableAlgorithms.and.returnValue(
      of([
        {
          id: 'RANDOM_FOREST_HPO',
          name: 'Random Forest (HPO)',
          description: '',
          hasHPO: true
        }
      ])
    );

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

    userSession.registerUser('usuario_teste', '.tie5Roanl');
    fixture.detectChanges();
  });

  it('deve criar o componente de login', () => {
    expect(component).toBeTruthy();
    expect(component.username).toBe('usuario_teste');
  });

  it('deve marcar INVALID_CREDENTIALS quando a senha textual for incorreta', () => {
    component.onPasswordSubmitted('senha_errada');

    expect(component.authResult).not.toBeNull();
    expect(component.authResult?.decision).toBe('INVALID_CREDENTIALS');
  });

  it('deve chamar API e exibir resultado GENUINE quando autenticado com sucesso', () => {
    const mockAuthResponse: AuthenticationResponse = {
      decision: 'GENUINE',
      confidenceScore: 0.94,
      thresholdScore: 0.75,
      algorithm: 'RANDOM_FOREST_HPO',
      inferenceTimeMs: 15,
      message: 'Acesso Permitido'
    };
    biometricApiSpy.authenticate.and.returnValue(of(mockAuthResponse));

    spyOn(captureService, 'computeSample').and.returnValue({
      repetition: 1,
      textEntered: '.tie5Roanl',
      features: { 'H.period': 0.14 },
      rawTimings: [{ key: '.', code: 'Period', pressTime: 100, releaseTime: 240 }],
      totalDurationMs: 140
    });

    component.onPasswordSubmitted('.tie5Roanl');

    expect(biometricApiSpy.authenticate).toHaveBeenCalled();
    expect(component.authResult?.decision).toBe('GENUINE');
    expect(component.authResult?.confidenceScore).toBe(0.94);
  });
});
