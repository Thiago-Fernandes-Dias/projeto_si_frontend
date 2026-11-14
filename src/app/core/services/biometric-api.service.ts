import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AuthenticationPayload,
  AuthenticationResponse,
  EnrollmentPayload,
  EnrollmentResponse,
  HealthResponse
} from '../models/keystroke.model';
import { RegistrationRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class BiometricApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  registerUser(request: RegistrationRequest): Observable<{ success: boolean; message: string }> {
    return this.http
      .post<{ success: boolean; message: string }>(`${this.baseUrl}/register`, request)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError('Falha ao registrar usuário.', error)
        )
      );
  }

  submitEnrollment(payload: EnrollmentPayload): Observable<EnrollmentResponse> {
    return this.http
      .post<EnrollmentResponse>(`${this.baseUrl}/enrollment`, payload)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError('Falha ao enviar amostras para o servidor.', error)
        )
      );
  }

  authenticate(payload: AuthenticationPayload): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(`${this.baseUrl}/authenticate`, payload)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError('Falha ao realizar autenticação biométrica.', error)
        )
      );
  }

  checkHealth(): Observable<HealthResponse> {
    return this.http
      .get<HealthResponse>(`${this.baseUrl}/health`)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError('Falha ao verificar integridade do serviço.', error)
        )
      );
  }

  private handleError(defaultMessage: string, error: HttpErrorResponse): Observable<never> {
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

    return throwError(() => new Error(resolvedMessage));
  }
}
