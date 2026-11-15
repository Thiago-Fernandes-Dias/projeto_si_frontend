import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from '../services/user-session.service';

export const registeredUserGuard: CanActivateFn = () => {
  const userSession = inject(UserSessionService);
  const router = inject(Router);

  if (userSession.currentUser()) {
    return true;
  }
  return router.createUrlTree(['/register']);
};
