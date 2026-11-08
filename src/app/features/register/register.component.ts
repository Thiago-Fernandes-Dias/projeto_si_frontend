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
    <div class="container">
      <div class="form-box">
        <form (ngSubmit)="onSubmit()">
          <h1>Cadastro</h1>
          <p class="form-subtitle">
            Defina seu identificador e a senha que será utilizada para o perfil biométrico de digitação.
          </p>

          <div class="input-box">
            <input
              id="username"
              name="username"
              type="text"
              [(ngModel)]="username"
              placeholder="Usuário"
              aria-label="Identificador / Usuário"
              required
            />
            <i class="bx bxs-user" aria-hidden="true"></i>
          </div>

          <div class="input-box">
            <input
              id="password"
              name="password"
              type="text"
              [(ngModel)]="password"
              placeholder="Senha escolhida"
              aria-label="Senha escolhida"
              required
            />
            <i class="bx bxs-lock-alt" aria-hidden="true"></i>
          </div>

          <div class="input-box">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="text"
              [(ngModel)]="confirmPassword"
              placeholder="Confirmar senha"
              aria-label="Confirmar senha"
              required
            />
            <i class="bx bxs-lock" aria-hidden="true"></i>
          </div>

          @if (errorMessage) {
            <div class="alert alert-error" role="alert">
              <i class="bx bxs-error-circle" aria-hidden="true"></i>
              <span>{{ errorMessage }}</span>
            </div>
          }

          <button type="submit" class="btn" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Cadastrando...' : 'Prosseguir para a coleta' }}
            @if (!isSubmitting) {
              <i class="bx bx-right-arrow-alt" aria-hidden="true"></i>
            }
          </button>

          <p class="field-hint">
            Recomendação: escolha uma senha que você consiga digitar com naturalidade e fluidez.
          </p>
        </form>
      </div>

      <div class="toggle-panel">
        <i class="bx bxs-user-plus panel-icon" aria-hidden="true"></i>
        <h1>Keystroke Dynamics Biometrics</h1>
        <p>
          Depois do cadastro, você vai digitar a senha 5 vezes para o sistema aprender o seu ritmo de digitação.
        </p>
      </div>
    </div>
  `
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
