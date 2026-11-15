import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DebugLoggerService } from '../services/debug-logger.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const debugLogger = inject(DebugLoggerService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  debugLogger.debug('session', 'guard_redirect', { guard: 'authGuard', target: '/login' });
  return router.createUrlTree(['/login']);
};
