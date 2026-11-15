import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  private readonly router = inject(Router);
  private readonly userSession = inject(UserSessionService);
  private readonly debugLogger = inject(DebugLoggerService);

  username = '';
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  errorMessage = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmNewPassword = false;

  readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  readonly passwordMaxLength = PASSWORD_MAX_LENGTH;

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmNewPasswordVisibility(): void {
    this.showConfirmNewPassword = !this.showConfirmNewPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';
    const validationError = this.validate();

    if (validationError) {
      this.errorMessage = validationError.message;
      this.debugLogger.debug('password-change', 'password_change_validation_failed', {
        reason: validationError.reason
      });
      return;
    }

    const trimmedUsername = this.username.trim();
    this.userSession.startPasswordChange(trimmedUsername, this.currentPassword, this.newPassword);
    this.debugLogger.debug('password-change', 'password_change_form_completed', {
      username: trimmedUsername,
      nextRoute: '/enrollment'
    });
    this.router.navigate(['/enrollment']);
  }

  private validate(): { reason: string; message: string } | null {
    if (!this.username.trim()) {
      return { reason: 'username_empty', message: 'Informe seu nome de usuário.' };
    }
    if (!isValidUsername(this.username)) {
      return { reason: 'username_invalid', message: USERNAME_RULE_MESSAGE };
    }
    if (!this.currentPassword) {
      return { reason: 'current_password_empty', message: 'Informe a senha atual.' };
    }
    if (!this.newPassword) {
      return { reason: 'new_password_empty', message: 'Defina a nova senha.' };
    }
    if (!isPasswordLengthValid(this.newPassword)) {
      return { reason: 'new_password_length_invalid', message: PASSWORD_LENGTH_MESSAGE };
    }
    if (containsDeadKeyCharacter(this.newPassword)) {
      return { reason: 'new_password_dead_key_character', message: PASSWORD_DEAD_KEY_MESSAGE };
    }
    if (this.newPassword !== this.confirmNewPassword) {
      return { reason: 'new_password_mismatch', message: 'A confirmação não coincide com a nova senha.' };
    }
    if (this.newPassword === this.currentPassword) {
      return { reason: 'new_password_equals_current', message: 'A nova senha deve ser diferente da senha atual.' };
    }
    return null;
  }
}
