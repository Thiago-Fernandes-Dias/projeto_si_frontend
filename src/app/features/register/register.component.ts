import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { DebugLoggerService } from '../../core/services/debug-logger.service';
import {
  PASSWORD_DEAD_KEY_MESSAGE,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_RULE_MESSAGE,
  containsDeadKeyCharacter,
  isPasswordLengthValid,
  isValidUsername
} from '../../core/validation/credential-rules';

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
  private readonly debugLogger = inject(DebugLoggerService);

  username = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  readonly passwordMaxLength = PASSWORD_MAX_LENGTH;

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
      this.debugLogger.debug('register', 'register_validation_failed', { reason: 'username_empty' });
      return;
    }

    if (!isValidUsername(this.username)) {
      this.errorMessage = USERNAME_RULE_MESSAGE;
      this.debugLogger.debug('register', 'register_validation_failed', { reason: 'username_invalid' });
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Defina a senha para o cadastro.';
      this.debugLogger.debug('register', 'register_validation_failed', { reason: 'password_empty' });
      return;
    }

    if (!isPasswordLengthValid(this.password)) {
      this.errorMessage = PASSWORD_LENGTH_MESSAGE;
      this.debugLogger.debug('register', 'register_validation_failed', {
        reason: 'password_length_invalid',
        passwordLength: this.password.length
      });
      return;
    }

    if (containsDeadKeyCharacter(this.password)) {
      this.errorMessage = PASSWORD_DEAD_KEY_MESSAGE;
      this.debugLogger.debug('register', 'register_validation_failed', { reason: 'password_dead_key_character' });
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'As senhas digitadas não coincidem.';
      this.debugLogger.debug('register', 'register_validation_failed', { reason: 'password_mismatch' });
      return;
    }

    const trimmedUsername = this.username.trim();
    this.userSession.registerUser(trimmedUsername, this.password);
    this.debugLogger.debug('register', 'register_completed', {
      username: trimmedUsername,
      nextRoute: '/enrollment'
    });
    this.router.navigate(['/enrollment']);
  }
}
