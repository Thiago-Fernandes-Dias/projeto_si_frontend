import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EnrollmentComponent } from './enrollment.component';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { ApiError, BiometricApiService } from '../../core/services/biometric-api.service';
import { of, throwError } from 'rxjs';

describe('EnrollmentComponent', () => {
  let component: EnrollmentComponent;
  let fixture: ComponentFixture<EnrollmentComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let userSession: UserSessionService;
  let captureService: KeystrokeCaptureService;
  let biometricApiSpy: jasmine.SpyObj<BiometricApiService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    biometricApiSpy = jasmine.createSpyObj('BiometricApiService', ['registerUser', 'changePassword']);
    biometricApiSpy.registerUser.and.returnValue(
      of({ success: true, message: 'Ok', samplesRegistered: 5, calculatedAverageHoldMs: 110.5 })
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

  it('deve rejeitar tentativa com senha divergente da cadastrada sem exibir a senha escolhida', () => {
    component.onSampleSubmitted('senha_errada');
    expect(component.validationError).toContain('Texto incorreto');
    expect(component.validationError).not.toContain(component.targetPassword);
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

  it('deve submeter lote de 5 amostras, exibir botão de prosseguir e bloquear o campo de senha sem redirecionamento automático', () => {
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

    expect(biometricApiSpy.registerUser).toHaveBeenCalledTimes(1);
    const request = biometricApiSpy.registerUser.calls.mostRecent().args[0];
    expect(request.username).toBe('teste_user');
    expect(request.password).toBe('.tie5Roanl');
    expect(request.samples.length).toBe(5);
    expect(request.samples.map((sample) => sample.repetition)).toEqual([1, 2, 3, 4, 5]);
    expect(component.submissionSuccess).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const proceedButton = element.querySelector<HTMLButtonElement>('.proceed-button');
    const inputElement = element.querySelector<HTMLInputElement>('.keystroke-field');

    expect(proceedButton).not.toBeNull();
    expect(proceedButton?.textContent).toContain('Prosseguir para o login');
    expect(inputElement?.disabled).toBeTrue();

    // Navegação só deve ocorrer após o clique no botão
    proceedButton?.click();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('não deve solicitar ou permitir a coleta de uma 6ª amostra', () => {
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
  });

  it('deve exibir mensagem de erro caso o envio das amostras falhe na API', () => {
    biometricApiSpy.registerUser.and.returnValue(
      throwError(() => new Error('Falha no servidor ao processar amostras.'))
    );

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

    expect(component.submissionSuccess).toBeFalse();
    expect(component.isSubmitting).toBeFalse();
    expect(component.validationError).toBe('Falha no servidor ao processar amostras.');
  });

  describe('falha no envio do lote', () => {
    function collectFiveSamples(): void {
      spyOn(captureService, 'computeSample').and.callFake((rep: number) => ({
        repetition: rep,
        textEntered: '.tie5Roanl',
        features: { 'H.period.0': 0.12 },
        rawTimings: [],
        totalDurationMs: 1200
      }));

      for (let i = 1; i <= 5; i++) {
        component.onSampleSubmitted('.tie5Roanl');
      }
      fixture.detectChanges();
    }

    function element(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    it('deve manter as amostras e permitir reenviar o mesmo lote após erro do servidor', () => {
      biometricApiSpy.registerUser.and.returnValues(
        throwError(() => new ApiError('Erro interno no servidor.', 500)),
        of({ success: true, message: 'Ok', samplesRegistered: 5 })
      );

      collectFiveSamples();

      expect(component.canRetrySubmission).toBeTrue();
      expect(component.currentRepetition).toBe(5);
      expect(element().querySelector<HTMLInputElement>('.keystroke-field')?.disabled).toBeTrue();

      const retryButton = element().querySelector<HTMLButtonElement>('.retry-button');
      expect(retryButton?.textContent).toContain('Tentar enviar novamente');

      retryButton?.click();
      fixture.detectChanges();

      expect(biometricApiSpy.registerUser).toHaveBeenCalledTimes(2);
      const [firstPayload] = biometricApiSpy.registerUser.calls.argsFor(0);
      const [secondPayload] = biometricApiSpy.registerUser.calls.argsFor(1);
      expect(secondPayload.samples).toEqual(firstPayload.samples);
      expect(component.submissionSuccess).toBeTrue();
      expect(component.canRetrySubmission).toBeFalse();
      expect(component.validationError).toBeNull();
      expect(element().querySelector('.retry-button')).toBeNull();
      expect(element().querySelector('.proceed-button')?.textContent).toContain('Prosseguir para o login');
    });

    it('deve permitir reenviar após falha de conexão', () => {
      biometricApiSpy.registerUser.and.returnValue(
        throwError(() => new ApiError('Não foi possível conectar ao servidor.', 0))
      );

      collectFiveSamples();

      expect(component.canRetrySubmission).toBeTrue();
      expect(component.validationError).toBe('Não foi possível conectar ao servidor.');
    });

    it('deve descartar as amostras e recomeçar a coleta quando o backend recusar o lote (400)', () => {
      biometricApiSpy.registerUser.and.returnValue(
        throwError(() => new ApiError('A amostra 3 possui features inválidas ou incompatíveis com a senha.', 400))
      );

      collectFiveSamples();

      expect(component.currentRepetition).toBe(0);
      expect(component.canRetrySubmission).toBeFalse();
      expect(component.submissionSuccess).toBeFalse();
      expect(component.validationError).toContain('A amostra 3 possui features inválidas');
      expect(component.validationError).toContain('Digite a senha novamente 5 vezes');
      expect(element().querySelector<HTMLInputElement>('.keystroke-field')?.disabled).toBeFalse();
      expect(element().querySelector('.retry-button')).toBeNull();
    });

    it('deve orientar a escolher outro nome quando o usuário já existir (409), sem considerar a coleta concluída', () => {
      biometricApiSpy.registerUser.and.returnValue(
        throwError(() => new ApiError('Nome de usuário indisponível.', 409))
      );

      collectFiveSamples();

      expect(component.submissionSuccess).toBeFalse();
      expect(component.canRetrySubmission).toBeFalse();
      expect(component.validationError).toBe(
        'Nome de usuário indisponível. Volte ao cadastro e escolha outro nome de usuário.'
      );
      expect(element().querySelector('.proceed-button')).toBeNull();
      expect(element().querySelector<HTMLButtonElement>('.back-button')?.disabled).toBeFalse();
    });
  });

  describe('troca de senha', () => {
    beforeEach(() => {
      userSession.startPasswordChange('teste_user', 'senhaAtual123', '.tie5Roanl');
      biometricApiSpy.changePassword.and.returnValue(
        of({ success: true, message: 'Senha alterada.', samplesRegistered: 5, calculatedAverageHoldMs: 110 })
      );
      fixture.detectChanges();
    });

    function collectFiveSamples(): void {
      spyOn(captureService, 'computeSample').and.callFake((rep: number) => ({
        repetition: rep,
        textEntered: '.tie5Roanl',
        features: { 'H.period.0': 0.12 },
        rawTimings: [],
        totalDurationMs: 1200
      }));

      for (let i = 1; i <= 5; i++) {
        component.onSampleSubmitted('.tie5Roanl');
      }
      fixture.detectChanges();
    }

    function element(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    it('deve pedir a nova senha no subtítulo e voltar para a troca de senha', () => {
      expect(element().querySelector('.form-subtitle')?.textContent).toContain('Nova senha para reprodução: .tie5Roanl');

      const backButton = element().querySelector<HTMLButtonElement>('.back-button');
      expect(backButton?.getAttribute('aria-label')).toBe('Voltar para a troca de senha');
      backButton?.click();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/change-password']);
    });

    it('deve enviar as 5 amostras da nova senha para a troca de senha, e não para o cadastro', () => {
      collectFiveSamples();

      expect(biometricApiSpy.registerUser).not.toHaveBeenCalled();
      expect(biometricApiSpy.changePassword).toHaveBeenCalledTimes(1);
      const request = biometricApiSpy.changePassword.calls.mostRecent().args[0];
      expect(request.username).toBe('teste_user');
      expect(request.currentPassword).toBe('senhaAtual123');
      expect(request.newPassword).toBe('.tie5Roanl');
      expect(request.samples.length).toBe(5);

      expect(component.submissionSuccess).toBeTrue();
      expect(element().querySelector('.alert-success')?.textContent).toContain('Senha alterada com sucesso!');
      expect(element().querySelector('.proceed-button')?.textContent).toContain('Prosseguir para o login');
    });

    it('deve avisar que a troca de senha ainda não existe no servidor quando o backend responder 404', () => {
      biometricApiSpy.changePassword.and.returnValue(
        throwError(() => new ApiError('Http failure response for /api/change-password: 404 Not Found', 404))
      );

      collectFiveSamples();

      expect(component.submissionSuccess).toBeFalse();
      expect(component.canRetrySubmission).toBeFalse();
      expect(component.validationError).toContain('A troca de senha ainda não está disponível no servidor');
      expect(element().querySelector('.retry-button')).toBeNull();
    });

    it('deve orientar a conferir os dados quando a senha atual for recusada (401), sem reenviar', () => {
      biometricApiSpy.changePassword.and.returnValue(
        throwError(() => new ApiError('Usuário ou senha atual incorretos.', 401))
      );

      collectFiveSamples();

      expect(component.canRetrySubmission).toBeFalse();
      expect(component.validationError).toBe('Usuário ou senha atual incorretos. Volte e confira os dados informados.');
      expect(element().querySelector<HTMLButtonElement>('.back-button')?.disabled).toBeFalse();
    });

    it('deve permitir reenviar após erro do servidor', () => {
      biometricApiSpy.changePassword.and.returnValue(throwError(() => new ApiError('Erro interno.', 500)));

      collectFiveSamples();

      expect(component.canRetrySubmission).toBeTrue();
      expect(element().querySelector('.retry-button')).not.toBeNull();
    });
  });
});
