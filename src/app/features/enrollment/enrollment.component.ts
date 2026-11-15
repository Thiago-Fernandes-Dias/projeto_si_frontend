import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { DebugLoggerService } from '../../core/services/debug-logger.service';
import { KeystrokeInputComponent } from '../../shared/components/keystroke-input/keystroke-input.component';
import { RegistrationRequest } from '../../core/models/keystroke.model';

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

  get currentUsername(): string {
    return this.userSession.currentUser()?.username || 'Usuário Padrão';
  }

  get targetPassword(): string {
    return this.userSession.currentUser()?.targetPassword || '.tie5Roanl';
  }

  get currentRepetition(): number {
    return this.userSession.currentRepetitionCount();
  }

  get isEnrollmentComplete(): boolean {
    return this.userSession.isEnrollmentComplete() || this.currentRepetition >= this.totalRequiredRepetitions;
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
    this.router.navigate(['/register']);
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

  private submitAllSamples(): void {
    this.isSubmitting = true;
    const samples = this.userSession.enrollmentSamples();
    const correlationId = this.enrollmentCorrelationId;

    const payload: RegistrationRequest = {
      username: this.currentUsername,
      password: this.targetPassword,
      samples
    };

    this.debugLogger.debug(
      'enrollment',
      'enrollment_batch_submitting',
      {
        username: payload.username,
        samplesCount: payload.samples.length,
        passwordLength: payload.password.length
      },
      correlationId
    );

    this.debugLogger.withCorrelation(correlationId, () => {
      this.biometricApi.registerUser(payload).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.submissionSuccess = true;
          this.debugLogger.debug(
            'enrollment',
            'enrollment_batch_succeeded',
            {
              username: payload.username,
              samplesRegistered: response.samplesRegistered,
              calculatedAverageHoldMs: response.calculatedAverageHoldMs
            },
            correlationId
          );
        },
        error: (error: Error) => {
          this.isSubmitting = false;
          this.submissionSuccess = false;
          this.validationError = error?.message || 'Falha ao enviar lote de amostras para o servidor.';
          this.debugLogger.debug(
            'enrollment',
            'enrollment_batch_failed',
            { username: payload.username, error: this.validationError },
            correlationId
          );
        }
      });
    });
  }
}
