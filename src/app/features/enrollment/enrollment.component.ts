import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { ApiError, BiometricApiService } from '../../core/services/biometric-api.service';
import { DebugLoggerService } from '../../core/services/debug-logger.service';
import { KeystrokeInputComponent } from '../../shared/components/keystroke-input/keystroke-input.component';
import {
  KeystrokeSample,
  PasswordChangeRequest,
  RegistrationRequest,
  RegistrationResponse
} from '../../core/models/keystroke.model';

@Component({
  selector: 'app-enrollment',
  standalone: true,
  imports: [CommonModule, KeystrokeInputComponent],
  templateUrl: './enrollment.component.html',
  styleUrl: './enrollment.component.scss'
})
export class EnrollmentComponent {
  private readonly router = inject(Router);
  readonly userSession = inject(UserSessionService);
  private readonly captureService = inject(KeystrokeCaptureService);
  private readonly biometricApi = inject(BiometricApiService);
  private readonly debugLogger = inject(DebugLoggerService);
  private readonly enrollmentCorrelationId = this.debugLogger.newCorrelationId();

  @ViewChild('keystrokeInput') keystrokeInputComponent?: KeystrokeInputComponent;

  readonly totalRequiredRepetitions = 5;
  readonly steps = [1, 2, 3, 4, 5];

  validationError: string | null = null;
  submissionSuccess = false;
  isSubmitting = false;
  canRetrySubmission = false;

  get currentUsername(): string {
    return this.userSession.currentUser()?.username ?? '';
  }

  get targetPassword(): string {
    return this.userSession.currentUser()?.targetPassword ?? '';
  }

  get currentRepetition(): number {
    return this.userSession.currentRepetitionCount();
  }

  get isEnrollmentComplete(): boolean {
    return this.userSession.isEnrollmentComplete() || this.currentRepetition >= this.totalRequiredRepetitions;
  }

  get isPasswordChange(): boolean {
    return this.userSession.currentUser()?.flow === 'password-change';
  }

  get backButtonLabel(): string {
    return this.isPasswordChange ? 'Voltar para a troca de senha' : 'Voltar para o cadastro';
  }

  get successMessage(): string {
    return this.isPasswordChange
      ? 'Senha alterada com sucesso! As 5 amostras da nova senha foram registradas.'
      : 'Coleta de 5 amostras concluída com sucesso!';
  }

  goBack(): void {
    this.debugLogger.debug(
      'enrollment',
      'enrollment_cancelled_back_to_register',
      { username: this.currentUsername, completedSamples: this.currentRepetition },
      this.enrollmentCorrelationId
    );
    this.captureService.stopRecording();
    this.captureService.reset();
    this.router.navigate([this.isPasswordChange ? '/change-password' : '/register']);
  }

  onSampleSubmitted(enteredText: string): void {
    if (this.isEnrollmentComplete || this.isSubmitting) {
      return;
    }

    this.validationError = null;
    const nextRepetitionIndex = this.currentRepetition + 1;

    if (enteredText !== this.targetPassword) {
      this.debugLogger.debug(
        'enrollment',
        'enrollment_sample_mismatch',
        {
          username: this.currentUsername,
          repetition: nextRepetitionIndex,
          enteredLength: enteredText.length,
          expectedLength: this.targetPassword.length
        },
        this.enrollmentCorrelationId
      );
      this.validationError = 'Texto incorreto. A senha digitada não corresponde à cadastrada. Tente novamente.';
      this.keystrokeInputComponent?.clearInput();
      return;
    }

    try {
      const sample = this.captureService.computeSample(nextRepetitionIndex, this.targetPassword);
      const totalCount = this.userSession.addEnrollmentSample(sample);
      this.debugLogger.debug(
        'enrollment',
        'enrollment_sample_captured',
        {
          username: this.currentUsername,
          repetition: nextRepetitionIndex,
          totalCount,
          requiredCount: this.totalRequiredRepetitions,
          totalDurationMs: sample.totalDurationMs,
          featureCount: Object.keys(sample.features).length
        },
        this.enrollmentCorrelationId
      );

      this.keystrokeInputComponent?.clearInput();

      if (totalCount >= this.totalRequiredRepetitions) {
        this.submitAllSamples();
      }
    } catch (error) {
      const message = (error as Error).message || 'Erro ao extrair características biométricas.';
      this.debugLogger.debug(
        'enrollment',
        'enrollment_sample_capture_failed',
        { username: this.currentUsername, repetition: nextRepetitionIndex, reason: message },
        this.enrollmentCorrelationId
      );
      this.validationError = message;
      this.keystrokeInputComponent?.clearInput();
    }
  }

  goToLogin(): void {
    this.debugLogger.debug(
      'enrollment',
      'enrollment_navigated_to_login',
      { username: this.currentUsername },
      this.enrollmentCorrelationId
    );
    this.captureService.stopRecording();
    this.captureService.reset();
    this.router.navigate(['/login']);
  }

  retrySubmission(): void {
    if (!this.canRetrySubmission || this.isSubmitting) {
      return;
    }
    this.submitAllSamples();
  }

  private submitAllSamples(): void {
    this.isSubmitting = true;
    this.canRetrySubmission = false;
    this.validationError = null;
    const samples = this.userSession.enrollmentSamples();
    const correlationId = this.enrollmentCorrelationId;
    const username = this.currentUsername;
    const flow = this.isPasswordChange ? 'password-change' : 'registration';

    this.debugLogger.debug(
      'enrollment',
      'enrollment_batch_submitting',
      {
        username,
        flow,
        samplesCount: samples.length,
        passwordLength: this.targetPassword.length
      },
      correlationId
    );

    this.debugLogger.withCorrelation(correlationId, () => {
      this.submitSamplesForCurrentFlow(samples).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.submissionSuccess = true;
          this.debugLogger.debug(
            'enrollment',
            'enrollment_batch_succeeded',
            {
              username,
              flow,
              samplesRegistered: response.samplesRegistered,
              calculatedAverageHoldMs: response.calculatedAverageHoldMs
            },
            correlationId
          );
        },
        error: (error: Error) => this.handleSubmissionError(error, username, correlationId)
      });
    });
  }

  private submitSamplesForCurrentFlow(samples: KeystrokeSample[]): Observable<RegistrationResponse> {
    if (this.isPasswordChange) {
      const request: PasswordChangeRequest = {
        username: this.currentUsername,
        currentPassword: this.userSession.currentUser()?.currentPassword ?? '',
        newPassword: this.targetPassword,
        samples
      };
      return this.biometricApi.changePassword(request);
    }

    const request: RegistrationRequest = {
      username: this.currentUsername,
      password: this.targetPassword,
      samples
    };
    return this.biometricApi.registerUser(request);
  }

  // POST /api/register: 409 = nome de usuário já existe. POST /api/change-password: 401 = senha atual
  // incorreta e 404 = endpoint ainda ausente no backend. Em ambos, 400 = lote recusado.
  private handleSubmissionError(error: Error, username: string, correlationId: string): void {
    this.isSubmitting = false;
    this.submissionSuccess = false;
    const message = error?.message || 'Falha ao enviar lote de amostras para o servidor.';
    const status = error instanceof ApiError ? error.status : 0;

    if (status === 409 && !this.isPasswordChange) {
      this.validationError = `${message} Volte ao cadastro e escolha outro nome de usuário.`;
    } else if (status === 404 && this.isPasswordChange) {
      this.validationError =
        'A troca de senha ainda não está disponível no servidor (o backend ainda não tem o endpoint /api/change-password).';
    } else if (status === 401) {
      this.validationError = `${message} Volte e confira os dados informados.`;
    } else if (status === 400) {
      this.userSession.clearEnrollment();
      this.validationError = `${message} Digite a senha novamente ${this.totalRequiredRepetitions} vezes.`;
    } else {
      this.canRetrySubmission = true;
      this.validationError = message;
    }

    this.debugLogger.debug(
      'enrollment',
      'enrollment_batch_failed',
      { username, status, error: this.validationError, canRetry: this.canRetrySubmission },
      correlationId
    );
  }
}
