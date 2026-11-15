import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { DebugLoggerService } from '../../core/services/debug-logger.service';
import { KeystrokeInputComponent } from '../../shared/components/keystroke-input/keystroke-input.component';
import {
  AuthenticationPayload,
  AuthenticationResponse
} from '../../core/models/keystroke.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KeystrokeInputComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private readonly userSession = inject(UserSessionService);
  private readonly captureService = inject(KeystrokeCaptureService);
  private readonly biometricApi = inject(BiometricApiService);
  private readonly authService = inject(AuthService);
  private readonly debugLogger = inject(DebugLoggerService);
  private readonly router = inject(Router);

  username = '';
  isAuthenticating = false;
  authResult: AuthenticationResponse | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    const user = this.userSession.currentUser();
    this.username = user?.username ?? '';
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
    this.errorMessage = null;
    const correlationId = this.debugLogger.newCorrelationId();

    try {
      const sample = this.captureService.computeSample(1);
      const resolvedPasswordAttempt = passwordAttempt || sample.textEntered;
      this.isAuthenticating = true;

      const payload: AuthenticationPayload = {
        username: this.username,
        passwordAttempt: resolvedPasswordAttempt,
        sample
      };

      this.debugLogger.debug(
        'login',
        'login_attempt_started',
        {
          username: this.username,
          passwordLength: resolvedPasswordAttempt.length,
          totalDurationMs: sample.totalDurationMs,
          featureCount: Object.keys(sample.features).length
        },
        correlationId
      );

      this.debugLogger.withCorrelation(correlationId, () => {
        this.biometricApi.authenticate(payload).subscribe({
          next: (response) => {
            this.authResult = response;
            this.isAuthenticating = false;
            this.debugLogger.debug(
              'login',
              'login_decision_received',
              {
                username: this.username,
                decision: response.decision,
                confidenceScore: response.confidenceScore,
                thresholdScore: response.thresholdScore,
                inferenceTimeMs: response.inferenceTimeMs,
                tokenIssued: Boolean(response.accessToken)
              },
              correlationId
            );
            if (response.decision === 'GENUINE') {
              this.authService.startSession({
                username: this.username,
                confidenceScore: response.confidenceScore,
                authenticatedAt: new Date().toISOString(),
                ...(response.accessToken !== undefined ? { accessToken: response.accessToken } : {}),
                ...(response.accessTokenExpiresAt !== undefined
                  ? { accessTokenExpiresAt: response.accessTokenExpiresAt }
                  : {})
              });
              this.router.navigate(['/session']);
            } else if (response.decision === 'IMPOSTOR') {
              this.authService.registerBlockedAttempt({ username: this.username, result: response });
              this.router.navigate(['/blocked']);
            }
          },
          error: (error: Error) => {
            this.isAuthenticating = false;
            this.errorMessage = error?.message || 'Falha ao realizar autenticação biométrica.';
            this.debugLogger.debug(
              'login',
              'login_attempt_error',
              { username: this.username, error: this.errorMessage },
              correlationId
            );
          }
        });
      });
    } catch (error) {
      const message = (error as Error).message || 'Erro de captura biométrica.';
      this.debugLogger.debug(
        'login',
        'login_capture_failed',
        { username: this.username, reason: message },
        correlationId
      );
      this.authResult = {
        decision: 'INVALID_CREDENTIALS',
        confidenceScore: 0,
        thresholdScore: 0.75,
        inferenceTimeMs: 0,
        message
      };
    }
  }
}
