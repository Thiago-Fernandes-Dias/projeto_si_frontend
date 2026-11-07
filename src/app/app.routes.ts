import { Routes } from '@angular/router';

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
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard e Métricas - Keystroke Biometrics'
  },
  {
    path: '**',
    redirectTo: 'register'
  }
];
