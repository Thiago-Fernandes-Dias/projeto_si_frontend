import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { of } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let userSession: UserSessionService;
  let biometricApiSpy: jasmine.SpyObj<BiometricApiService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    biometricApiSpy = jasmine.createSpyObj('BiometricApiService', ['registerUser']);
    biometricApiSpy.registerUser.and.returnValue(of({ success: true, message: 'Ok' }));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: BiometricApiService, useValue: biometricApiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    userSession = TestBed.inject(UserSessionService);
    fixture.detectChanges();
  });

  it('deve criar o componente de cadastro', () => {
    expect(component).toBeTruthy();
  });

  it('deve preencher o padrão CMU com o botão de atalho', () => {
    component.useBenchmarkPassword();
    expect(component.password).toBe('.tie5Roanl');
    expect(component.confirmPassword).toBe('.tie5Roanl');
  });

  it('deve validar campos vazios e senhas divergentes', () => {
    component.username = '';
    component.onSubmit();
    expect(component.errorMessage).toContain('nome de usuário válido');

    component.username = 'thiago';
    component.password = '1234';
    component.confirmPassword = '5678';
    component.onSubmit();
    expect(component.errorMessage).toContain('senhas digitadas não coincidem');
  });

  it('deve cadastrar com sucesso e navegar para /enrollment', () => {
    component.username = 'caique_rodrigues';
    component.password = '.tie5Roanl';
    component.confirmPassword = '.tie5Roanl';

    component.onSubmit();

    expect(biometricApiSpy.registerUser).toHaveBeenCalled();
    expect(userSession.currentUser()?.username).toBe('caique_rodrigues');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/enrollment']);
  });
});
