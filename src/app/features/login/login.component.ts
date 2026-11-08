import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { KeystrokeInputComponent } from '../../shared/components/keystroke-input/keystroke-input.component';
import {
  AuthenticationPayload,
  AuthenticationResponse,
  MachineLearningAlgorithm
} from '../../core/models/keystroke.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KeystrokeInputComponent],
  template: `
    <div class="container panel-left">
      <div class="form-box">
        <form (ngSubmit)="onLoginSubmit()">
          <h1>Login</h1>
          <p class="form-subtitle">
            Autenticação combinada: validação de credencial textual e dinâmica de digitação.
          </p>

          <div class="input-box">
            <input
              id="usernameInput"
              name="usernameInput"
              type="text"
              [(ngModel)]="username"
              placeholder="Identificador do usuário"
              aria-label="Identificador do usuário"
              required
            />
            <i class="bx bxs-user" aria-hidden="true"></i>
          </div>

          <div class="keystroke-group">
            <app-keystroke-input
              #keystrokeInput
              placeholder="Digite sua senha e tecle Enter..."
              (textSubmitted)="onPasswordSubmitted($event)"
            ></app-keystroke-input>
          </div>

          <button type="submit" class="btn" [disabled]="isAuthenticating">
            {{ isAuthenticating ? 'Processando inferência de IA...' : 'Autenticar sessão' }}
          </button>
        </form>

        @if (authResult; as result) {
          <div
            class="decision-card"
            [class.decision-allowed]="result.decision === 'GENUINE'"
            [class.decision-blocked]="result.decision === 'IMPOSTOR'"
            [class.decision-invalid]="result.decision === 'INVALID_CREDENTIALS'"
          >
            <div class="decision-header">
              <i
                class="bx decision-icon"
                [class.bxs-check-circle]="result.decision === 'GENUINE'"
                [class.bx-block]="result.decision === 'IMPOSTOR'"
                [class.bxs-error]="result.decision === 'INVALID_CREDENTIALS'"
                aria-hidden="true"
              ></i>
              <div>
                <h3>
                  {{
                    result.decision === 'GENUINE'
                      ? 'ACESSO PERMITIDO'
                      : result.decision === 'IMPOSTOR'
                      ? 'ACESSO BLOQUEADO (IMPOSTOR DETECTADO)'
                      : 'CREDENCIAL INCORRETA'
                  }}
                </h3>
                <p class="decision-message">{{ result.message }}</p>
              </div>
            </div>

            @if (result.decision !== 'INVALID_CREDENTIALS') {
              <div class="decision-metrics">
                <div class="metric-item">
                  <span class="metric-label">Grau de Confiança</span>
                  <span class="metric-value">{{ (result.confidenceScore * 100).toFixed(1) }}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Limiar de Decisão</span>
                  <span class="metric-value">{{ (result.thresholdScore * 100).toFixed(0) }}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Tempo de Inferência</span>
                  <span class="metric-value">{{ result.inferenceTimeMs }} ms</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Hold Médio</span>
                  <span class="metric-value">{{ result.attemptAverageHoldTimeMs }} ms</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <div class="toggle-panel">
        <i class="bx bx-fingerprint panel-icon" aria-hidden="true"></i>
        <h1>Keystroke Dynamics Biometrics</h1>
        <p>Ainda não tem cadastro ou quer trocar a senha?</p>
        <a routerLink="/register" class="btn">Cadastrar</a>
      </div>
    </div>
  `,
  styles: [`
    .keystroke-group {
      margin: 0 0 22px;
    }

    .decision-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 18px;
      padding: 14px 16px;
      border-radius: 12px;
      text-align: left;

      &.decision-allowed {
        background: #e6f6ee;
        color: #12633d;
      }

      &.decision-blocked {
        background: #fdecec;
        color: #9b1c1c;
      }

      &.decision-invalid {
        background: #fff4dc;
        color: #8a5300;
      }
    }

    .decision-header {
      display: flex;
      align-items: center;
      gap: 10px;

      .decision-icon {
        font-size: 30px;
        flex-shrink: 0;
      }

      h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }

      .decision-message {
        margin: 2px 0 0;
        font-size: 13px;
        line-height: 1.4;
      }
    }

    .decision-metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px dashed currentColor;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
    }

    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.8;
    }

    .metric-value {
      font-size: 16px;
      font-weight: 700;
    }
  `]
})
export class LoginComponent implements OnInit {
  private readonly userSession = inject(UserSessionService);
  private readonly captureService = inject(KeystrokeCaptureService);
  private readonly biometricApi = inject(BiometricApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly defaultAlgorithm: MachineLearningAlgorithm = 'RANDOM_FOREST_HPO';

  username = '';
  isAuthenticating = false;
  authResult: AuthenticationResponse | null = null;

  ngOnInit(): void {
    const user = this.userSession.currentUser();
    this.username = user?.username || 's002_cmu';
  }

  onPasswordSubmitted(enteredText: string): void {
    this.executeAuthentication(enteredText);
  }

  onLoginSubmit(): void {
    const currentText = this.captureService.currentText();
    this.executeAuthentication(currentText);
  }

  private executeAuthentication(passwordAttempt: string): void {
    this.authResult = null;
    const targetPassword = this.userSession.currentUser()?.targetPassword || '.tie5Roanl';

    if (passwordAttempt !== targetPassword) {
      this.authResult = {
        decision: 'INVALID_CREDENTIALS',
        confidenceScore: 0,
        thresholdScore: 0.75,
        algorithm: this.defaultAlgorithm,
        inferenceTimeMs: 0,
        message: 'A senha textual digitada está incorreta.'
      };
      return;
    }

    try {
      const sample = this.captureService.computeSample(1, targetPassword);
      this.isAuthenticating = true;

      const payload: AuthenticationPayload = {
        username: this.username,
        passwordAttempt,
        sample,
        selectedAlgorithm: this.defaultAlgorithm
      };

      this.biometricApi.authenticate(payload).subscribe({
        next: (response) => {
          this.authResult = response;
          this.isAuthenticating = false;
          if (response.decision === 'GENUINE') {
            this.authService.startSession({
              username: this.username,
              confidenceScore: response.confidenceScore,
              authenticatedAt: new Date().toISOString()
            });
            this.router.navigate(['/session']);
          } else if (response.decision === 'IMPOSTOR') {
            this.authService.registerBlockedAttempt({ username: this.username, result: response });
            this.router.navigate(['/blocked']);
          }
        },
        error: () => {
          this.isAuthenticating = false;
        }
      });
    } catch (error) {
      this.authResult = {
        decision: 'INVALID_CREDENTIALS',
        confidenceScore: 0,
        thresholdScore: 0.75,
        algorithm: this.defaultAlgorithm,
        inferenceTimeMs: 0,
        message: (error as Error).message || 'Erro de captura biométrica.'
      };
    }
  }
}
