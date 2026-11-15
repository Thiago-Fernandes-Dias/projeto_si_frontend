import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let userSession: UserSessionService;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [{ provide: Router, useValue: routerSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    userSession = TestBed.inject(UserSessionService);
    fixture.detectChanges();
  });

  it('deve criar o componente de cadastro', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o nome do sistema no painel azul', () => {
    const panel = (fixture.nativeElement as HTMLElement).querySelector('.toggle-panel');
    expect(panel?.querySelector('h1')?.textContent).toContain('Keystroke Dynamics Biometrics');
    expect(panel?.textContent).not.toContain('Etapa 1 de 2');
  });

  it('deve mostrar "Usuário" como dica no campo de identificador', () => {
    const usernameInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#username');
    expect(usernameInput?.placeholder).toBe('Usuário');
  });

  it('não deve oferecer atalho para preencher a senha padrão do CMU', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).not.toContain('padrão CMU');
    expect(element.querySelector('.quick-preset-button')).toBeNull();
  });

  it('deve iniciar com os campos de senha ocultos por padrão', () => {
    const passwordInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#password');
    const confirmPasswordInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#confirmPassword');

    expect(component.showPassword).toBeFalse();
    expect(component.showConfirmPassword).toBeFalse();
    expect(passwordInput?.type).toBe('password');
    expect(confirmPasswordInput?.type).toBe('password');
  });

  it('deve alternar a visibilidade da senha escolhida ao clicar no botão correspondente', () => {
    const element = fixture.nativeElement as HTMLElement;
    const passwordInput = element.querySelector<HTMLInputElement>('#password');
    const toggleButton = element.querySelectorAll<HTMLButtonElement>('.visibility-toggle-button')[0];
    const icon = toggleButton.querySelector('i');

    expect(toggleButton.getAttribute('aria-label')).toBe('Ver senha');
    expect(icon?.classList.contains('bx-hide')).toBeTrue();
    expect(icon?.classList.contains('bxs-lock-alt')).toBeFalse();

    toggleButton.click();
    fixture.detectChanges();

    expect(component.showPassword).toBeTrue();
    expect(passwordInput?.type).toBe('text');
    expect(toggleButton.getAttribute('aria-label')).toBe('Ocultar senha');
    expect(icon?.classList.contains('bx-show')).toBeTrue();

    toggleButton.click();
    fixture.detectChanges();

    expect(component.showPassword).toBeFalse();
    expect(passwordInput?.type).toBe('password');
    expect(toggleButton.getAttribute('aria-label')).toBe('Ver senha');
    expect(icon?.classList.contains('bx-hide')).toBeTrue();
  });

  it('deve alternar a visibilidade da confirmação de senha ao clicar no botão correspondente', () => {
    const element = fixture.nativeElement as HTMLElement;
    const confirmPasswordInput = element.querySelector<HTMLInputElement>('#confirmPassword');
    const toggleButton = element.querySelectorAll<HTMLButtonElement>('.visibility-toggle-button')[1];
    const icon = toggleButton.querySelector('i');

    expect(toggleButton.getAttribute('aria-label')).toBe('Ver senha');
    expect(icon?.classList.contains('bx-hide')).toBeTrue();
    expect(icon?.classList.contains('bxs-lock')).toBeFalse();

    toggleButton.click();
    fixture.detectChanges();

    expect(component.showConfirmPassword).toBeTrue();
    expect(confirmPasswordInput?.type).toBe('text');
    expect(toggleButton.getAttribute('aria-label')).toBe('Ocultar senha');
    expect(icon?.classList.contains('bx-show')).toBeTrue();

    toggleButton.click();
    fixture.detectChanges();

    expect(component.showConfirmPassword).toBeFalse();
    expect(confirmPasswordInput?.type).toBe('password');
    expect(toggleButton.getAttribute('aria-label')).toBe('Ver senha');
    expect(icon?.classList.contains('bx-hide')).toBeTrue();
  });

  it('deve validar campos vazios e senhas divergentes', () => {
    component.username = '';
    component.onSubmit();
    expect(component.errorMessage).toContain('nome de usuário válido');

    component.username = 'thiago';
    component.password = '12345678';
    component.confirmPassword = '87654321';
    component.onSubmit();
    expect(component.errorMessage).toContain('senhas digitadas não coincidem');
  });

  it('deve exigir senha com tamanho entre 8 e 64 caracteres', () => {
    component.username = 'thiago';
    component.password = 'curta';
    component.confirmPassword = 'curta';

    component.onSubmit();

    expect(component.errorMessage).toContain('entre 8 e 64 caracteres');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  describe('regras do backend', () => {
    function submitWith(username: string, password: string): void {
      component.username = username;
      component.password = password;
      component.confirmPassword = password;
      component.onSubmit();
    }

    it('deve exibir as regras de usuário e senha como dica no formulário', () => {
      const hint = (fixture.nativeElement as HTMLElement).querySelector('.rules-hint');
      expect(hint?.textContent).toContain('3 a 50 caracteres');
      expect(hint?.textContent).toContain('8 a 64 caracteres');
    });

    it('deve recusar senha com menos de 8 ou mais de 64 caracteres sem avançar para a coleta', () => {
      submitWith('thiago', 'abc1234');
      expect(component.errorMessage).toBe('A senha deve ter entre 8 e 64 caracteres.');

      submitWith('thiago', 'a'.repeat(65));
      expect(component.errorMessage).toBe('A senha deve ter entre 8 e 64 caracteres.');

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('deve aceitar senhas com exatamente 8 e 64 caracteres', () => {
      submitWith('thiago', 'abcd1234');
      expect(component.errorMessage).toBe('');

      submitWith('thiago', 'a'.repeat(64));
      expect(component.errorMessage).toBe('');

      expect(routerSpy.navigate).toHaveBeenCalledTimes(2);
    });

    it('deve recusar usuário fora do padrão aceito pelo backend', () => {
      for (const invalidUsername of ['ab', 'a'.repeat(51), 'joão', 'nome com espaço', 'user#1']) {
        submitWith(invalidUsername, 'senha1234');
        expect(component.errorMessage).toContain('O usuário deve ter entre 3 e 50 caracteres');
      }

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('deve aceitar usuário com maiúsculas e espaços nas pontas, como o backend após normalizar', () => {
      submitWith('  Julia.Vital@ufabc+1  ', 'senha1234');

      expect(component.errorMessage).toBe('');
      expect(userSession.currentUser()?.username).toBe('Julia.Vital@ufabc+1');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/enrollment']);
    });

    it('deve recusar senha com letras acentuadas ou acentos de tecla morta', () => {
      for (const invalidPassword of ['senhaçãoA', 'caféaberto', 'senha~1234', 'senha^1234', 'senha´1234', 'senha`1234', 'senha¨1234']) {
        submitWith('thiago', invalidPassword);
        expect(component.errorMessage).toContain('não pode conter letras acentuadas');
      }

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('deve permitir ç e símbolos comuns na senha', () => {
      submitWith('thiago', 'Laço.@#1');

      expect(component.errorMessage).toBe('');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/enrollment']);
    });
  });

  it('deve salvar as credenciais localmente e navegar para /enrollment sem consumir a API', () => {
    component.username = 'caique_rodrigues';
    component.password = '.tie5Roanl';
    component.confirmPassword = '.tie5Roanl';

    component.onSubmit();

    expect(userSession.currentUser()?.username).toBe('caique_rodrigues');
    expect(userSession.currentUser()?.targetPassword).toBe('.tie5Roanl');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/enrollment']);
  });

  it('não deve navegar quando a validação falha', () => {
    component.username = 'caique_rodrigues';
    component.password = '.tie5Roanl';
    component.confirmPassword = 'senha_diferente';

    component.onSubmit();

    expect(component.errorMessage).toBe('As senhas digitadas não coincidem.');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
