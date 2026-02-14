import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';

/**
 * Role Guard Factory - Creates guards that check for specific user roles
 *
 * Usage: Add to route configuration with required role
 * ```typescript
 * {
 *   path: 'claims/manage',
 *   component: ClaimsAdminComponent,
 *   canActivate: [roleGuard('chamber_admin')]
 * }
 * ```
 */
export const roleGuard = (requiredRole: string): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.currentProfile$.pipe(
      take(1),
      map(profile => {
        if (profile && profile.role === requiredRole) {
          return true;
        }

        // Redirect to appropriate page based on their actual role
        if (!profile) {
          router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
        } else {
          // User is authenticated but doesn't have the required role
          router.navigate(['/dashboard']);
        }
        return false;
      })
    );
  };
};
