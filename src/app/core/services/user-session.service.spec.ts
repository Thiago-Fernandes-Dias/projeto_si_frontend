import { TestBed } from '@angular/core/testing';
import { UserSessionService } from './user-session.service';
import { KeystrokeSample } from '../models/keystroke.model';

describe('UserSessionService', () => {
  let service: UserSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserSessionService);
  });

  it('deve iniciar sem usuário cadastrado, sem usuário padrão de demonstração', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.currentRepetitionCount()).toBe(0);
  });

  it('deve marcar o cadastro como fluxo de registro', () => {
    service.registerUser('novo_usuario', 'senha1234');

    expect(service.currentUser()?.flow).toBe('registration');
    expect(service.currentUser()?.currentPassword).toBeUndefined();
  });

  it('deve iniciar a troca de senha com a nova senha como alvo da coleta', () => {
    service.registerUser('outro_usuario', 'senha1234');
    service.addEnrollmentSample({
      repetition: 1,
      textEntered: 'senha1234',
      features: {},
      rawTimings: [],
      totalDurationMs: 500
    });

    service.startPasswordChange('usuario_troca', 'senhaAtual123', 'novaSenha456');

    const user = service.currentUser();
    expect(user?.flow).toBe('password-change');
    expect(user?.username).toBe('usuario_troca');
    expect(user?.currentPassword).toBe('senhaAtual123');
    expect(user?.targetPassword).toBe('novaSenha456');
    expect(user?.isEnrolled).toBeFalse();
    expect(service.currentRepetitionCount()).toBe(0);
  });

  it('deve descartar as amostras coletadas em clearEnrollment', () => {
    service.registerUser('usuario_coleta', 'senha1234');
    service.addEnrollmentSample({
      repetition: 1,
      textEntered: 'senha1234',
      features: {},
      rawTimings: [],
      totalDurationMs: 500
    });

    service.clearEnrollment();

    expect(service.currentRepetitionCount()).toBe(0);
    expect(service.currentUser()?.isEnrolled).toBeFalse();
    expect(service.currentUser()?.username).toBe('usuario_coleta');
  });

  it('deve cadastrar um novo usuário e reiniciar as repetições', () => {
    service.registerUser('novo_usuario', 'senhaSegura!1');

    const user = service.currentUser();
    expect(user?.username).toBe('novo_usuario');
    expect(user?.targetPassword).toBe('senhaSegura!1');
    expect(user?.isEnrolled).toBeFalse();
    expect(service.currentRepetitionCount()).toBe(0);
  });

  it('deve acumular 5 amostras e marcar enrollment como completo', () => {
    service.registerUser('usuario_coleta', 'teste123');

    const mockSample: KeystrokeSample = {
      repetition: 1,
      textEntered: 'teste123',
      features: {},
      rawTimings: [],
      totalDurationMs: 500
    };

    for (let index = 1; index <= 5; index++) {
      expect(service.isEnrollmentComplete()).toBeFalse();
      service.addEnrollmentSample({ ...mockSample, repetition: index });
    }

    expect(service.currentRepetitionCount()).toBe(5);
    expect(service.isEnrollmentComplete()).toBeTrue();
    expect(service.currentUser()?.isEnrolled).toBeTrue();
  });
});
