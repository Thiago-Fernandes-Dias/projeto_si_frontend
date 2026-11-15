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
