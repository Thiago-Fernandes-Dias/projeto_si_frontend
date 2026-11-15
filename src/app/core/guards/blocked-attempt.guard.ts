import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DebugLoggerService } from '../services/debug-logger.service';

export const blockedAttemptGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const debugLogger = inject(DebugLoggerService);
  const router = inject(Router);

  if (authService.blockedAttempt()) {
    return true;
  }
  debugLogger.debug('session', 'guard_redirect', {
    guard: 'blockedAttemptGuard',
    target: '/login'
  });
  return router.createUrlTree(['/login']);
};
