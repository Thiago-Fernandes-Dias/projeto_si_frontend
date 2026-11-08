import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'register'
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
    title: 'Coleta de Amostras - Keystroke Biometrics'
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
    path: '**',
    redirectTo: 'register'
  }
];
