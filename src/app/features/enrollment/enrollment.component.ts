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
    <div class="enrollment-card">
      <div class="card-header">
        <span class="step-badge">Etapa 2 de 2</span>
        <h2>Coleta de Amostras de Digitação</h2>
        <p class="subtitle">
          Para calibrar seu perfil biométrico com alta acurácia, digite sua senha exatamente
          <strong>5 vezes</strong> consecutivas no ritmo natural em que você costuma teclar.
        </p>
      </div>

      <div class="target-box">
        <div class="target-label">Senha Cadastrada para Reprodução:</div>
        <div class="target-password-display">{{ targetPassword }}</div>
        <div class="target-user-info">Usuário: <strong>{{ currentUsername }}</strong></div>
      </div>

      <!-- Stepper Visual das 5 Repetições -->
      <div class="stepper-container">
        <div class="stepper-header">
          <span>Progresso da Coleta</span>
          <strong>{{ currentRepetition }} de {{ totalRequiredRepetitions }} Amostras Concluídas</strong>
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
              [class.active]="step === currentRepetition + 1 && !isEnrollmentComplete"
            >
              {{ step <= currentRepetition ? '✓' : step }}
            </div>
          }
        </div>
      </div>

      @if (validationError) {
        <div class="warning-banner" role="alert">
          ⚠️ {{ validationError }}
        </div>
      }

      @if (submissionSuccess) {
        <div class="success-banner" role="status">
          🎉 Coleta de 5 amostras concluída com sucesso! Redirecionando para login...
        </div>
      }

      @if (!isEnrollmentComplete) {
        <div class="input-section">
          <label>
            Digite a repetição <strong>#{{ currentRepetition + 1 }}</strong> de <strong>{{ totalRequiredRepetitions }}</strong> e pressione <strong>Enter</strong>:
          </label>
          <app-keystroke-input
            #keystrokeInput
            [disabled]="isSubmitting"
            placeholder="Digite a senha e tecle Enter..."
            (textSubmitted)="onSampleSubmitted($event)"
          ></app-keystroke-input>
        </div>
      } @else {
        <div class="processing-section">
          <div class="spinner"></div>
          <p>
            {{ submissionSuccess ? 'Todas as 5 amostras coletadas. Redirecionando...' : 'Processando e enviando lote de 5 amostras biométricas...' }}
          </p>
        </div>
      }

      <div class="instructions-box">
        <h4>Diretrizes de Qualidade Biométrica:</h4>
        <ul>
          <li>Mantenha as duas mãos no teclado e digite no seu ritmo habitual.</li>
          <li><strong>Não use Backspace ou Delete:</strong> se errar uma tecla, o campo reinicia automaticamente para não distorcer as latências $H$, $DD$ e $UD$.</li>
          <li>Ação de colar (*Paste*) é estritamente proibida.</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .enrollment-card {
      max-width: 600px;
      margin: 2rem auto;
      background: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .card-header {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
    }

    .step-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    h2 {
      margin: 0;
      color: #0f172a;
      font-size: 1.5rem;
    }

    .subtitle {
      margin: 0.5rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .target-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 0.5rem;
      padding: 1rem;
      text-align: center;
    }

    .target-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .target-password-display {
      font-family: monospace;
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #0284c7;
    }

    .target-user-info {
      font-size: 0.85rem;
      color: #475569;
      margin-top: 0.25rem;
    }

    .stepper-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stepper-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: #334155;
    }

    .progress-track {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #10b981;
      transition: width 0.3s ease;
    }

    .steps-indicators {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
    }

    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 700;
      border: 2px solid #cbd5e1;
      background: #ffffff;
      color: #64748b;

      &.active {
        border-color: #3b82f6;
        color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }

      &.completed {
        background: #10b981;
        border-color: #10b981;
        color: #ffffff;
      }
    }

    .input-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-size: 0.95rem;
        color: #1e293b;
      }
    }

    .warning-banner {
      padding: 0.75rem 1rem;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #b45309;
      font-size: 0.875rem;
      border-radius: 0.25rem;
    }

    .success-banner {
      padding: 0.75rem 1rem;
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      color: #065f46;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 0.25rem;
    }

    .instructions-box {
      background: #f1f5f9;
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      color: #475569;

      h4 {
        margin: 0 0 0.5rem;
        color: #1e293b;
        font-size: 0.9rem;
      }

      ul {
        margin: 0;
        padding-left: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
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
