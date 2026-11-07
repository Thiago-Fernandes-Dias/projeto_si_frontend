import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
    <div class="login-container">
      <div class="login-card">
        <div class="card-header">
          <h2>Login com Biometria de Digitação</h2>
          <p class="subtitle">
            Autenticação combinada: validação de credencial textual e dinâmica de digitação.
          </p>
        </div>

        <form (ngSubmit)="onLoginSubmit()" class="form-body">
          <div class="form-group">
            <label for="usernameInput">Identificador do Usuário</label>
            <input
              id="usernameInput"
              name="usernameInput"
              type="text"
              [(ngModel)]="username"
              placeholder="Digite o identificador..."
              class="form-control"
              required
            />
          </div>

          <div class="form-group">
            <label>Senha do Usuário (Captura de Dinâmica Ativa)</label>
            <app-keystroke-input
              #keystrokeInput
              placeholder="Digite sua senha e tecle Enter..."
              (textSubmitted)="onPasswordSubmitted($event)"
            ></app-keystroke-input>
          </div>

          <button
            type="submit"
            class="primary-button"
            [disabled]="isAuthenticating"
          >
            {{ isAuthenticating ? 'Processando Inferência de IA...' : 'Autenticar Sessão ➔' }}
          </button>
        </form>

        <!-- Painel de Decisão de Acesso -->
        @if (authResult; as result) {
          <div
            class="decision-card"
            [class.decision-allowed]="result.decision === 'GENUINE'"
            [class.decision-blocked]="result.decision === 'IMPOSTOR'"
            [class.decision-invalid]="result.decision === 'INVALID_CREDENTIALS'"
          >
            <div class="decision-header">
              <span class="decision-icon">
                {{ result.decision === 'GENUINE' ? '✅' : result.decision === 'IMPOSTOR' ? '🚫' : '⚠️' }}
              </span>
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

        <div class="card-footer-nav">
          <a routerLink="/register">← Voltar para o Cadastro / Trocar Senha</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      max-width: 540px;
      margin: 2rem auto;
    }

    .login-card {
      background: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .card-header {
      padding: 1.5rem 2rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;

      h2 {
        margin: 0;
        color: #0f172a;
        font-size: 1.5rem;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        color: #64748b;
        font-size: 0.9rem;
      }
    }

    .form-body {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
      }
    }

    .form-control {
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.95rem;

      &:focus {
        border-color: #3b82f6;
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
    }

    .primary-button {
      padding: 0.85rem 1.5rem;
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 0.375rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover:not(:disabled) {
        background: #0369a1;
      }

      &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
      }
    }

    .decision-card {
      margin: 0 2rem 1.5rem;
      padding: 1.25rem;
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      &.decision-allowed {
        background-color: #ecfdf5;
        border: 2px solid #10b981;
        color: #065f46;

        h3 {
          color: #047857;
        }
      }

      &.decision-blocked {
        background-color: #fef2f2;
        border: 2px solid #ef4444;
        color: #991b1b;

        h3 {
          color: #b91c1c;
        }
      }

      &.decision-invalid {
        background-color: #fffbeb;
        border: 2px solid #f59e0b;
        color: #92400e;

        h3 {
          color: #b45309;
        }
      }
    }

    .decision-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .decision-icon {
        font-size: 2rem;
      }

      h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        letter-spacing: 0.05em;
      }

      .decision-message {
        margin: 0.25rem 0 0;
        font-size: 0.9rem;
      }
    }

    .decision-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px dashed rgba(0, 0, 0, 0.15);
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .metric-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      opacity: 0.8;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-family: monospace;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .card-footer-nav {
      padding: 1rem 2rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 0.85rem;

      a {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  private readonly userSession = inject(UserSessionService);
  private readonly captureService = inject(KeystrokeCaptureService);
  private readonly biometricApi = inject(BiometricApiService);

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
