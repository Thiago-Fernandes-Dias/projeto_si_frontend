import { TestBed } from '@angular/core/testing';
import { UserSessionService } from './user-session.service';
import { KeystrokeSample } from '../models/keystroke.model';

describe('UserSessionService', () => {
  let service: UserSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserSessionService);
  });

  it('deve inicializar com usuário padrão de demonstração', () => {
    expect(service.currentUser()).not.toBeNull();
    expect(service.selectedAlgorithm()).toBe('RANDOM_FOREST_HPO');
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

  it('deve atualizar o algoritmo selecionado', () => {
    service.setAlgorithm('KNN_HPO');
    expect(service.selectedAlgorithm()).toBe('KNN_HPO');
  });
});
