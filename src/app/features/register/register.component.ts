import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-card">
      <div class="card-header">
        <span class="step-badge">Etapa 1 de 2</span>
        <h2>Cadastro de Usuário</h2>
        <p class="subtitle">
          Defina seu identificador e a senha que será utilizada para o perfil biométrico de digitação.
        </p>
      </div>

      <form (ngSubmit)="onSubmit()" class="form-body">
        <div class="form-group">
          <label for="username">Identificador / Usuário</label>
          <input
            id="username"
            name="username"
            type="text"
            [(ngModel)]="username"
            placeholder="Ex.: thiago_dias ou RA"
            class="form-control"
            required
          />
        </div>

        <div class="form-group">
          <div class="label-row">
            <label for="password">Senha Escolhida</label>
            <button
              type="button"
              class="quick-preset-button"
              (click)="useBenchmarkPassword()"
            >
              Usar Padrão CMU (.tie5Roanl)
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="text"
            [(ngModel)]="password"
            placeholder="Digite a senha desejada..."
            class="form-control"
            required
          />
          <span class="field-hint">
            Recomendação: escolha uma senha que você consiga digitar com naturalidade e fluidez.
          </span>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirmar Senha</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="text"
            [(ngModel)]="confirmPassword"
            placeholder="Repita a senha..."
            class="form-control"
            required
          />
        </div>

        @if (errorMessage) {
          <div class="error-banner" role="alert">
            ⚠️ {{ errorMessage }}
          </div>
        }

        <div class="action-footer">
          <button
            type="submit"
            class="primary-button"
            [disabled]="isSubmitting"
          >
            {{ isSubmitting ? 'Cadastrando...' : 'Prosseguir para Coleta de Amostras (5 repetições) ➔' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 520px;
      margin: 2rem auto;
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
    }

    .step-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #e0f2fe;
      color: #0369a1;
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
      font-weight: 700;
    }

    .subtitle {
      margin: 0.5rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.4;
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
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
    }

    .quick-preset-button {
      background: none;
      border: none;
      color: #2563eb;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: #1d4ed8;
      }
    }

    .form-control {
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.95rem;
      transition: border-color 0.15s ease;

      &:focus {
        border-color: #3b82f6;
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
    }

    .field-hint {
      font-size: 0.75rem;
      color: #64748b;
    }

    .error-banner {
      padding: 0.75rem 1rem;
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
      font-size: 0.875rem;
      border-radius: 0.25rem;
    }

    .action-footer {
      margin-top: 0.5rem;
    }

    .primary-button {
      width: 100%;
      padding: 0.85rem 1.5rem;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover:not(:disabled) {
        background: #1d4ed8;
      }

      &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
      }
    }
  `]
})
export class RegisterComponent {
  private readonly router = inject(Router);
  private readonly userSession = inject(UserSessionService);
  private readonly biometricApi = inject(BiometricApiService);

  username = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  isSubmitting = false;

  useBenchmarkPassword(): void {
    this.password = '.tie5Roanl';
    this.confirmPassword = '.tie5Roanl';
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.username.trim()) {
      this.errorMessage = 'Informe um nome de usuário válido.';
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Defina a senha para o cadastro.';
      return;
    }

    if (this.password.length < 4) {
      this.errorMessage = 'A senha deve conter ao menos 4 caracteres para cálculo de dinâmica biométrica.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'As senhas digitadas não coincidem.';
      return;
    }

    this.isSubmitting = true;

    this.biometricApi
      .registerUser({
        username: this.username.trim(),
        targetPassword: this.password,
        confirmPassword: this.confirmPassword
      })
      .subscribe({
        next: () => {
          this.userSession.registerUser(this.username.trim(), this.password);
          this.isSubmitting = false;
          this.router.navigate(['/enrollment']);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error?.message || 'Falha ao registrar usuário.';
        }
      });
  }
}
