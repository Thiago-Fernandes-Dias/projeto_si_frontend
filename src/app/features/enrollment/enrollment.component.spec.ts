import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EnrollmentComponent } from './enrollment.component';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { of } from 'rxjs';

describe('EnrollmentComponent', () => {
  let component: EnrollmentComponent;
  let fixture: ComponentFixture<EnrollmentComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let userSession: UserSessionService;
  let captureService: KeystrokeCaptureService;
  let biometricApiSpy: jasmine.SpyObj<BiometricApiService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    biometricApiSpy = jasmine.createSpyObj('BiometricApiService', ['submitEnrollment']);
    biometricApiSpy.submitEnrollment.and.returnValue(
      of({ success: true, message: 'Ok', samplesRegistered: 5 })
    );

    await TestBed.configureTestingModule({
      imports: [EnrollmentComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: BiometricApiService, useValue: biometricApiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentComponent);
    component = fixture.componentInstance;
    userSession = TestBed.inject(UserSessionService);
    captureService = TestBed.inject(KeystrokeCaptureService);

    userSession.registerUser('teste_user', '.tie5Roanl');
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
    expect(component.targetPassword).toBe('.tie5Roanl');
    expect(component.currentUsername).toBe('teste_user');
  });

  it('deve pedir a senha no rótulo do campo de digitação', () => {
    const label = (fixture.nativeElement as HTMLElement).querySelector('.input-section label');
    expect(label?.textContent?.trim()).toBe('Digite sua senha e pressione Enter');
  });

  it('deve mostrar a senha e o usuário como subtítulo, no mesmo estilo do cadastro', () => {
    const element = fixture.nativeElement as HTMLElement;
    const subtitle = element.querySelector('.form-box .form-subtitle');

    expect(subtitle?.textContent).toContain('Senha cadastrada para reprodução: .tie5Roanl');
    expect(subtitle?.textContent).toContain('Usuário: teste_user');
    expect(element.querySelector('.target-box')).toBeNull();
  });

  describe('botão voltar', () => {
    function backButton(): HTMLButtonElement {
      return (fixture.nativeElement as HTMLElement).querySelector('.back-button') as HTMLButtonElement;
    }

    it('deve mostrar só o ícone de seta, com rótulo acessível', () => {
      expect(backButton()).not.toBeNull();
      expect(backButton().textContent?.trim()).toBe('');
      expect(backButton().querySelector('i.bx-arrow-back')).not.toBeNull();
      expect(backButton().getAttribute('aria-label')).toBe('Voltar para o cadastro');
    });

    it('deve encerrar a captura e voltar para /register', () => {
      captureService.startRecording();
      captureService.currentText.set('.tie');

      backButton().click();

      expect(captureService.isRecording()).toBeFalse();
      expect(captureService.currentText()).toBe('');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/register']);
    });

    it('deve ficar desabilitado depois que a coleta terminar', () => {
      component.submissionSuccess = true;
      fixture.detectChanges();

      expect(backButton().disabled).toBeTrue();
    });
  });

  it('não deve exibir o indicador de etapa no painel', () => {
    const panel = (fixture.nativeElement as HTMLElement).querySelector('.toggle-panel');
    expect(panel?.textContent).not.toContain('Etapa');
  });

  it('deve rejeitar tentativa com senha divergente da cadastrada', () => {
    component.onSampleSubmitted('senha_errada');
    expect(component.validationError).toContain('Texto incorreto');
    expect(component.currentRepetition).toBe(0);
  });

  it('deve registrar repetição válida e avançar progresso', () => {
    spyOn(captureService, 'computeSample').and.returnValue({
      repetition: 1,
      textEntered: '.tie5Roanl',
      features: { 'H.period': 0.12 },
      rawTimings: [],
      totalDurationMs: 1200
    });

    component.onSampleSubmitted('.tie5Roanl');

    expect(component.currentRepetition).toBe(1);
    expect(component.validationError).toBeNull();
  });

  it('deve submeter lote de 5 amostras e redirecionar para /login ao atingir a 5ª repetição', fakeAsync(() => {
    spyOn(captureService, 'computeSample').and.callFake((rep: number) => ({
      repetition: rep,
      textEntered: '.tie5Roanl',
      features: { 'H.period': 0.12 },
      rawTimings: [],
      totalDurationMs: 1200
    }));

    for (let i = 1; i <= 5; i++) {
      component.onSampleSubmitted('.tie5Roanl');
    }

    expect(biometricApiSpy.submitEnrollment).toHaveBeenCalled();
    expect(component.submissionSuccess).toBeTrue();

    tick(1500);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('não deve solicitar ou permitir a coleta de uma 6ª amostra', fakeAsync(() => {
    spyOn(captureService, 'computeSample').and.callFake((rep: number) => ({
      repetition: rep,
      textEntered: '.tie5Roanl',
      features: { 'H.period': 0.12 },
      rawTimings: [],
      totalDurationMs: 1200
    }));

    for (let i = 1; i <= 5; i++) {
      component.onSampleSubmitted('.tie5Roanl');
    }

    expect(component.isEnrollmentComplete).toBeTrue();
    expect(component.currentRepetition).toBe(5);

    // Tentativa de submeter uma 6ª amostra
    component.onSampleSubmitted('.tie5Roanl');
    expect(component.currentRepetition).toBe(5);

    tick(1500);
  }));
});
