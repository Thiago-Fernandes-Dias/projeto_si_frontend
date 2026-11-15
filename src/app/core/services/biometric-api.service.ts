import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import {
  AuthenticationPayload,
  AuthenticationResponse,
  HealthResponse,
  PasswordChangeRequest,
  PasswordChangeResponse,
  RegistrationRequest,
  RegistrationResponse
} from '../models/keystroke.model';
import { DebugLoggerService } from './debug-logger.service';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class BiometricApiService {
  private readonly http = inject(HttpClient);
  private readonly debugLogger = inject(DebugLoggerService);
  private readonly baseUrl = '/api';

  registerUser(request: RegistrationRequest): Observable<RegistrationResponse> {
    const correlationId = this.debugLogger.currentCorrelationId ?? undefined;
    this.debugLogger.debug(
      'register',
      'api_register_request',
      {
        username: request.username,
        passwordLength: request.password.length,
        samplesCount: request.samples.length
      },
      correlationId
    );
    return this.http
      .post<RegistrationResponse>(`${this.baseUrl}/register`, request)
      .pipe(
        tap((response) =>
          this.debugLogger.debug(
            'register',
            'api_register_response',
            {
              username: request.username,
              success: response.success,
              samplesRegistered: response.samplesRegistered,
              calculatedAverageHoldMs: response.calculatedAverageHoldMs
            },
            correlationId
          )
        ),
        catchError((error: HttpErrorResponse) =>
          this.handleError('register', 'Falha ao registrar usuário e amostras.', error, correlationId)
        )
      );
  }

  // Contrato da seção 5.4 do requisitos.md; o endpoint ainda não existe no projeto-si-backend.
  changePassword(request: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    const correlationId = this.debugLogger.currentCorrelationId ?? undefined;
    this.debugLogger.debug(
      'password-change',
      'api_change_password_request',
      {
        username: request.username,
        newPasswordLength: request.newPassword.length,
        samplesCount: request.samples.length
      },
      correlationId
    );
    return this.http
      .post<PasswordChangeResponse>(`${this.baseUrl}/change-password`, request)
      .pipe(
        tap((response) =>
          this.debugLogger.debug(
            'password-change',
            'api_change_password_response',
            {
              username: request.username,
              success: response.success,
              samplesRegistered: response.samplesRegistered
            },
            correlationId
          )
        ),
        catchError((error: HttpErrorResponse) =>
          this.handleError('password-change', 'Falha ao trocar a senha.', error, correlationId)
        )
      );
  }

  authenticate(payload: AuthenticationPayload): Observable<AuthenticationResponse> {
    const correlationId = this.debugLogger.currentCorrelationId ?? undefined;
    this.debugLogger.debug(
      'login',
      'api_authenticate_request',
      {
        username: payload.username,
        passwordLength: payload.passwordAttempt.length,
        totalDurationMs: payload.sample.totalDurationMs,
        featureCount: Object.keys(payload.sample.features).length
      },
      correlationId
    );
    return this.http
      .post<AuthenticationResponse>(`${this.baseUrl}/authenticate`, payload)
      .pipe(
        tap((response) =>
          this.debugLogger.debug(
            'login',
            'api_authenticate_response',
            {
              username: payload.username,
              decision: response.decision,
              confidenceScore: response.confidenceScore,
              thresholdScore: response.thresholdScore,
              inferenceTimeMs: response.inferenceTimeMs,
              userAverageHoldTimeMs: response.userAverageHoldTimeMs,
              attemptAverageHoldTimeMs: response.attemptAverageHoldTimeMs,
              tokenIssued: Boolean(response.accessToken)
            },
            correlationId
          )
        ),
        catchError((error: HttpErrorResponse) =>
          this.handleError('login', 'Falha ao realizar autenticação biométrica.', error, correlationId)
        )
      );
  }

  checkHealth(): Observable<HealthResponse> {
    return this.http
      .get<HealthResponse>(`${this.baseUrl}/health`)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError('http', 'Falha ao verificar integridade do serviço.', error)
        )
      );
  }

  private handleError(
    flow: 'register' | 'password-change' | 'enrollment' | 'login' | 'http',
    defaultMessage: string,
    error: HttpErrorResponse,
    correlationId?: string
  ): Observable<never> {
    let resolvedMessage = defaultMessage;

    if (error.status === 0) {
      resolvedMessage = 'Não foi possível conectar ao servidor. Verifique se a API está em execução.';
    } else if (typeof error.error?.message === 'string') {
      resolvedMessage = error.error.message;
    } else if (typeof error.error?.detail === 'string') {
      resolvedMessage = error.error.detail;
    } else if (typeof error.error?.title === 'string') {
      resolvedMessage = error.error.title;
    } else if (typeof error.error === 'string') {
      resolvedMessage = error.error;
    } else if (error.message) {
      resolvedMessage = error.message;
    }

    this.debugLogger.debug(
      flow,
      'api_error',
      {
        status: error.status,
        message: resolvedMessage
      },
      correlationId
    );

    return throwError(() => new ApiError(resolvedMessage, error.status));
  }
}
