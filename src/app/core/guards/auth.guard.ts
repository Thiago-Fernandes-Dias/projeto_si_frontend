import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { DebugLoggerService } from '../services/debug-logger.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const debugLogger = inject(DebugLoggerService);
  const router = inject(Router);
  const session = authService.currentSession();

  if (!session?.accessToken) {
    debugLogger.debug('session', 'guard_redirect', { guard: 'authGuard', target: '/login' });
    return router.createUrlTree(['/login']);
  }

  return http
    .get<{ username: string }>('/api/session', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
    .pipe(
      map(() => true),
      catchError(() => {
        debugLogger.debug('session', 'guard_token_invalid', {
          guard: 'authGuard',
          target: '/login'
        });
        authService.endSession();
        return of(router.createUrlTree(['/login']));
      })
    );
};
