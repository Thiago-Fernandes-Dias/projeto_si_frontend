import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { blockedAttemptGuard } from './core/guards/blocked-attempt.guard';
import { registeredUserGuard } from './core/guards/registered-user.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/register/register.component').then((m) => m.RegisterComponent),
    title: 'Cadastro - Keystroke Biometrics'
  },
  {
    path: 'enrollment',
    loadComponent: () =>
      import('./features/enrollment/enrollment.component').then((m) => m.EnrollmentComponent),
    canActivate: [registeredUserGuard],
    title: 'Coleta de Amostras - Keystroke Biometrics'
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./features/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
    title: 'Trocar Senha - Keystroke Biometrics'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    title: 'Login Biométrico - Keystroke Biometrics'
  },
  {
    path: 'session',
    loadComponent: () =>
      import('./features/session/session.component').then((m) => m.SessionComponent),
    canActivate: [authGuard],
    title: 'Sessão Autenticada - Keystroke Biometrics'
  },
  {
    path: 'blocked',
    loadComponent: () =>
      import('./features/blocked/blocked.component').then((m) => m.BlockedComponent),
    canActivate: [blockedAttemptGuard],
    title: 'Acesso Bloqueado - Keystroke Biometrics'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
