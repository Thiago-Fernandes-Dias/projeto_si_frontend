import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { KeystrokeInputComponent } from '../../shared/components/keystroke-input/keystroke-input.component';
import { EnrollmentPayload } from '../../core/models/keystroke.model';

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
    this.captureService.stopRecording();
    this.captureService.reset();
    this.router.navigate(['/register']);
  }

  onSampleSubmitted(enteredText: string): void {
    if (this.isEnrollmentComplete || this.isSubmitting) {
      return;
    }

    this.validationError = null;

    if (enteredText !== this.targetPassword) {
      this.validationError = `Texto incorreto. A senha digitada deve ser exatamente "${this.targetPassword}". Tente novamente.`;
      this.keystrokeInputComponent?.clearInput();
      return;
    }

    try {
      const nextRepetitionIndex = this.currentRepetition + 1;
      const sample = this.captureService.computeSample(nextRepetitionIndex, this.targetPassword);
      const totalCount = this.userSession.addEnrollmentSample(sample);

      this.keystrokeInputComponent?.clearInput();

      if (totalCount >= this.totalRequiredRepetitions) {
        this.submitAllSamples();
      }
    } catch (error) {
      this.validationError = (error as Error).message || 'Erro ao extrair características biométricas.';
      this.keystrokeInputComponent?.clearInput();
    }
  }

  goToLogin(): void {
    this.captureService.stopRecording();
    this.captureService.reset();
    this.router.navigate(['/login']);
  }

  private submitAllSamples(): void {
    this.isSubmitting = true;
    const samples = this.userSession.enrollmentSamples();

    const payload: EnrollmentPayload = {
      username: this.currentUsername,
      passwordLength: this.targetPassword.length,
      samplesCount: samples.length,
      samples
    };

    this.biometricApi.submitEnrollment(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submissionSuccess = true;
      },
      error: () => {
        this.isSubmitting = false;
        this.submissionSuccess = true;
      }
    });
  }
}
