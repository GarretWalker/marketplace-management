import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

/**
 * HTTP Interceptor - Automatically adds Supabase JWT auth token to API requests
 *
 * This interceptor runs on EVERY HTTP request made by the app and:
 * 1. Retrieves the current user's auth token from Supabase
 * 2. Adds it as a Bearer token in the Authorization header
 * 3. Skips adding the token for requests to Supabase itself (to avoid infinite loops)
 *
 * Why RxJS operators?
 * - getToken() returns a Promise, but Angular interceptors must return an Observable
 * - from() converts the Promise to an Observable
 * - switchMap() waits for the token to resolve before proceeding with the request
 * - This ensures the token is attached BEFORE the request is sent
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { from, switchMap } from 'rxjs';

const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Convert Promise to Observable so we can properly wait for the token
  return from(authService.getToken()).pipe(
    switchMap(token => {
      // Clone the request and add Authorization header if we have a token
      // Skip this for Supabase API calls to avoid redundant auth headers
      if (token && !req.url.includes('supabase.co')) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      // Proceed with the (possibly modified) request
      return next(req);
    })
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
