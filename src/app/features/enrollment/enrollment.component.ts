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
  template: `
    <div class="container static">
      <div class="form-box">
        <div>
          <button
            type="button"
            class="back-button"
            (click)="goBack()"
            [disabled]="isSubmitting || submissionSuccess"
            title="Voltar"
            aria-label="Voltar para o cadastro"
          >
            <i class="bx bx-arrow-back" aria-hidden="true"></i>
          </button>

          <h1>Coleta de Amostras</h1>

          <p class="form-subtitle">
            Senha cadastrada para reprodução: <strong>{{ targetPassword }}</strong><br />
            Usuário: <strong>{{ currentUsername }}</strong>
          </p>

          <div class="stepper-container">
            <div class="stepper-header">
              <span>Progresso da coleta</span>
              <strong>{{ currentRepetition }} de {{ totalRequiredRepetitions }} amostras</strong>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                [style.width.%]="(currentRepetition / totalRequiredRepetitions) * 100"
              ></div>
            </div>
            <div class="steps-indicators">
              @for (step of steps; track step) {
                <div
                  class="step-circle"
                  [class.completed]="step <= currentRepetition"
                  [class.active]="step === currentRepetition + 1"
                >
                  @if (step <= currentRepetition) {
                    <i class="bx bx-check" aria-hidden="true"></i>
                  } @else {
                    {{ step }}
                  }
                </div>
              }
            </div>
          </div>

          @if (validationError) {
            <div class="alert alert-warning" role="alert">
              <i class="bx bxs-error" aria-hidden="true"></i>
              <span>{{ validationError }}</span>
            </div>
          }

          @if (submissionSuccess) {
            <div class="alert alert-success" role="status">
              <i class="bx bxs-check-circle" aria-hidden="true"></i>
              <span>Coleta de 5 amostras concluída com sucesso! Redirecionando para login...</span>
            </div>
          }

          <div class="input-section">
            <label>Digite sua senha e pressione Enter</label>
            <app-keystroke-input
              #keystrokeInput
              [disabled]="isSubmitting || submissionSuccess"
              placeholder="Digite a senha e tecle Enter..."
              (textSubmitted)="onSampleSubmitted($event)"
            ></app-keystroke-input>
          </div>
        </div>
      </div>

      <div class="toggle-panel">
        <i class="bx bxs-keyboard panel-icon" aria-hidden="true"></i>
        <h1>Digite 5 vezes</h1>
        <p>
          Para calibrar seu perfil biométrico com alta acurácia, digite sua senha exatamente
          <strong>5 vezes</strong> consecutivas no ritmo natural em que você costuma teclar.
        </p>

        <div class="guidelines">
          <h4>Diretrizes de qualidade biométrica</h4>
          <ul>
            <li>Mantenha as duas mãos no teclado e digite no seu ritmo habitual.</li>
            <li>
              <strong>Não use Backspace ou Delete:</strong> se errar uma tecla, o campo reinicia
              automaticamente para não distorcer as latências H, DD e UD.
            </li>
            <li>Colar a senha (<em>Paste</em>) é estritamente proibido.</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back-button {
      position: absolute;
      top: 24px;
      left: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      background: #eee;
      border: none;
      border-radius: 50%;
      color: #333;
      font-size: 22px;
      cursor: pointer;
      transition: background-color 0.2s, color 0.2s;

      &:hover:not(:disabled) {
        background: #dfe5f8;
        color: #4a6fd6;
      }

      &:focus-visible {
        outline: 2px solid #7494ec;
        outline-offset: 2px;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    @media screen and (max-width: 650px) {
      .back-button {
        top: 16px;
        left: 16px;
      }
    }

    .stepper-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 18px 0;
    }

    .stepper-header {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #555;
    }

    .progress-track {
      width: 100%;
      height: 8px;
      background: #eee;
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #7494ec;
      transition: width 0.3s ease;
    }

    .steps-indicators {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }

    .step-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 2px solid #ddd;
      background: #fff;
      color: #888;
      font-size: 14px;
      font-weight: 600;

      i {
        font-size: 20px;
      }

      &.active {
        border-color: #7494ec;
        color: #7494ec;
        box-shadow: 0 0 0 3px rgba(116, 148, 236, 0.25);
      }

      &.completed {
        background: #7494ec;
        border-color: #7494ec;
        color: #fff;
      }
    }

    .input-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: left;

      label {
        font-size: 14px;
        color: #333;
      }
    }

    .guidelines {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      text-align: left;
      font-size: 13px;
      line-height: 1.5;

      h4 {
        margin: 0 0 6px;
        font-size: 13.5px;
      }

      ul {
        margin: 0;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    }
    .processing-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8fafc;
      border: 1px dashed #3b82f6;
      border-radius: 0.5rem;
      text-align: center;
      color: #1e40af;
      font-weight: 500;

      .spinner {
        width: 32px;
        height: 32px;
        border: 4px solid #bfdbfe;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
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
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: () => {
        this.isSubmitting = false;
        this.submissionSuccess = true;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      }
    });
  }
}
