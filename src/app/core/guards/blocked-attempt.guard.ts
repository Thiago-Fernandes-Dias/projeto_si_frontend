import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const blockedAttemptGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.blockedAttempt()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
