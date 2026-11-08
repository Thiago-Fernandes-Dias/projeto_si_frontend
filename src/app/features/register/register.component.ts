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
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
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
  showPassword = false;
  showConfirmPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
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
