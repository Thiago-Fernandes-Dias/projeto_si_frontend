import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';

import { registeredUserGuard } from './registered-user.guard';
import { UserSessionService } from '../services/user-session.service';

describe('registeredUserGuard', () => {
  function executeGuard(): MaybeAsync<GuardResult> {
    return TestBed.runInInjectionContext(() =>
      registeredUserGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('deve liberar /enrollment quando há um usuário cadastrado na sessão', () => {
    TestBed.inject(UserSessionService).registerUser('usuario_teste', 'senha1234');

    expect(executeGuard()).toBeTrue();
  });

  it('deve mandar para /register quando não há usuário cadastrado', () => {
    const result = executeGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/register');
  });
});
