import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { DebugLoggerService } from '../services/debug-logger.service';

export const CORRELATION_HEADER = 'X-Correlation-ID';

export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  const debugLogger = inject(DebugLoggerService);
  const correlationId =
    req.headers.get(CORRELATION_HEADER) ??
    debugLogger.currentCorrelationId ??
    debugLogger.newCorrelationId();

  const tracedRequest = req.headers.has(CORRELATION_HEADER)
    ? req
    : req.clone({ setHeaders: { [CORRELATION_HEADER]: correlationId } });

  const startedAt = performance.now();
  debugLogger.debug(
    'http',
    'frontend_http_request_started',
    { method: tracedRequest.method, url: tracedRequest.url },
    correlationId
  );

  return next(tracedRequest).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const durationMs = Number((performance.now() - startedAt).toFixed(2));
        debugLogger.debug(
          'http',
          'frontend_http_request_completed',
          {
            method: tracedRequest.method,
            url: tracedRequest.url,
            status: event.status,
            durationMs
          },
          correlationId
        );
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const durationMs = Number((performance.now() - startedAt).toFixed(2));
      debugLogger.debug(
        'http',
        'frontend_http_request_failed',
        {
          method: tracedRequest.method,
          url: tracedRequest.url,
          status: error.status,
          durationMs
        },
        correlationId
      );
      return throwError(() => error);
    })
  );
};
