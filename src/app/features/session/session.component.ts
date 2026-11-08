import { Component, inject } from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [DatePipe, PercentPipe],
  template: `
    <div class="container panel-left static">
      <div class="form-box">
        <div>
          <h1>Sessão autenticada</h1>
          <p class="form-subtitle">Você entrou com senha e dinâmica de digitação.</p>

          @if (authService.currentSession(); as session) {
            <ul class="session-details">
              <li>
                <i class="bx bxs-user" aria-hidden="true"></i>
                <span>Usuário:</span>
                <strong>{{ session.username }}</strong>
              </li>
              <li>
                <i class="bx bxs-check-shield" aria-hidden="true"></i>
                <span>Confiança do modelo:</span>
                <strong>{{ session.confidenceScore | percent: '1.1-1' }}</strong>
              </li>
              <li>
                <i class="bx bxs-time" aria-hidden="true"></i>
                <span>Entrada:</span>
                <strong>{{ session.authenticatedAt | date: 'dd/MM/yyyy HH:mm' }}</strong>
              </li>
            </ul>
          }

          <button type="button" class="btn" (click)="logout()">
            <i class="bx bx-log-out" aria-hidden="true"></i>
            Sair
          </button>
        </div>
      </div>

      <div class="toggle-panel">
        <i class="bx bxs-check-shield panel-icon" aria-hidden="true"></i>
        <h1>Acesso permitido</h1>
        <p>Sua senha e o seu ritmo de digitação foram reconhecidos.</p>
      </div>
    </div>
  `,
  styles: [`
    .session-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 22px 0;
      padding: 0;
      list-style: none;
      text-align: left;

      li {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: #eee;
        border-radius: 8px;
        font-size: 14.5px;
      }

      i {
        font-size: 20px;
        color: #7494ec;
      }

      strong {
        margin-left: auto;
      }
    }
  `]
})
export class SessionComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly captureService = inject(KeystrokeCaptureService);

  logout(): void {
    this.authService.endSession();
    this.captureService.stopRecording();
    this.captureService.reset();
    this.router.navigate(['/login']);
  }
}
