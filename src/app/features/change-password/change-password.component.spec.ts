import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ChangePasswordComponent } from './change-password.component';
import { UserSessionService } from '../../core/services/user-session.service';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let router: Router;
  let userSession: UserSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    userSession = TestBed.inject(UserSessionService);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function fill(username: string, currentPassword: string, newPassword: string, confirmNewPassword = newPassword): void {
    component.username = username;
    component.currentPassword = currentPassword;
    component.newPassword = newPassword;
    component.confirmNewPassword = confirmNewPassword;
    component.onSubmit();
  }

  it('deve exibir os campos de usuário, senha atual, nova senha e confirmação, com senhas ocultas', () => {
    for (const id of ['#currentPassword', '#newPassword', '#confirmNewPassword']) {
      expect(element().querySelector<HTMLInputElement>(id)?.type).withContext(id).toBe('password');
    }
    expect(element().querySelector<HTMLInputElement>('#username')?.placeholder).toBe('Usuário');
    expect(element().querySelector('h1')?.textContent).toContain('Trocar senha');
  });

  it('deve alternar a visibilidade de cada campo de senha com os ícones de olho', () => {
    const toggles = element().querySelectorAll<HTMLButtonElement>('.visibility-toggle-button');
    expect(toggles.length).toBe(3);

    toggles[0].click();
    toggles[1].click();
    toggles[2].click();
    fixture.detectChanges();

    expect(element().querySelector<HTMLInputElement>('#currentPassword')?.type).toBe('text');
    expect(element().querySelector<HTMLInputElement>('#newPassword')?.type).toBe('text');
    expect(element().querySelector<HTMLInputElement>('#confirmNewPassword')?.type).toBe('text');
    expect(toggles[0].querySelector('i')?.classList.contains('bx-show')).toBeTrue();
  });

  it('deve oferecer um link de volta ao login', () => {
    const link = element().querySelector<HTMLAnchorElement>('.back-to-login');
    expect(link?.getAttribute('href')).toBe('/login');
  });

  it('deve exigir usuário válido e a senha atual', () => {
    fill('', 'senhaAtual123', 'novaSenha456');
    expect(component.errorMessage).toBe('Informe seu nome de usuário.');

    fill('jo', 'senhaAtual123', 'novaSenha456');
    expect(component.errorMessage).toContain('O usuário deve ter entre 3 e 50 caracteres');

    fill('thiago', '', 'novaSenha456');
    expect(component.errorMessage).toBe('Informe a senha atual.');

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve aplicar à nova senha as mesmas regras do cadastro', () => {
    fill('thiago', 'senhaAtual123', '');
    expect(component.errorMessage).toBe('Defina a nova senha.');

    fill('thiago', 'senhaAtual123', 'curta');
    expect(component.errorMessage).toBe('A senha deve ter entre 8 e 64 caracteres.');

    fill('thiago', 'senhaAtual123', 'novaSenhá456');
    expect(component.errorMessage).toContain('não pode conter letras acentuadas');

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve exigir confirmação igual e nova senha diferente da atual', () => {
    fill('thiago', 'senhaAtual123', 'novaSenha456', 'outraSenha789');
    expect(component.errorMessage).toBe('A confirmação não coincide com a nova senha.');

    fill('thiago', 'senhaAtual123', 'senhaAtual123');
    expect(component.errorMessage).toBe('A nova senha deve ser diferente da senha atual.');

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve iniciar a troca de senha na sessão e seguir para a coleta da nova senha', () => {
    fill('  Thiago  ', 'senhaAtual123', 'novaSenha456');

    expect(component.errorMessage).toBe('');
    const user = userSession.currentUser();
    expect(user?.flow).toBe('password-change');
    expect(user?.username).toBe('Thiago');
    expect(user?.currentPassword).toBe('senhaAtual123');
    expect(user?.targetPassword).toBe('novaSenha456');
    expect(router.navigate).toHaveBeenCalledWith(['/enrollment']);
  });

  it('deve exibir a mensagem de erro no formulário', () => {
    fill('thiago', 'senhaAtual123', 'senhaAtual123');
    fixture.detectChanges();

    expect(element().querySelector('.alert-error')?.textContent).toContain(
      'A nova senha deve ser diferente da senha atual.'
    );
  });
});
