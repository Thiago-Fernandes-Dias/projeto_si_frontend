import { Component, inject } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BlockedAttempt } from '../../core/models/user.model';

@Component({
  selector: 'app-blocked',
  standalone: true,
  imports: [PercentPipe],
  template: `
    <div class="container danger">
      <div class="form-box">
        <div>
          <h1>Tentativa recusada</h1>

          @if (attempt; as blocked) {
            <p class="form-subtitle">Usuário: <strong>{{ blocked.username }}</strong></p>

            <ul class="details-list">
              <li>
                <i class="bx bx-target-lock" aria-hidden="true"></i>
                <span>Grau de Confiança</span>
                <strong>{{ blocked.result.confidenceScore | percent: '1.1-1' }}</strong>
              </li>
              <li>
                <i class="bx bx-slider-alt" aria-hidden="true"></i>
                <span>Limiar de Decisão</span>
                <strong>{{ blocked.result.thresholdScore | percent: '1.0-0' }}</strong>
              </li>
              <li>
                <i class="bx bx-timer" aria-hidden="true"></i>
                <span>Tempo de Inferência</span>
                <strong>{{ blocked.result.inferenceTimeMs }} ms</strong>
              </li>
              <li>
                <i class="bx bxs-keyboard" aria-hidden="true"></i>
                <span>Hold Médio</span>
                <strong>{{ averageHoldLabel }}</strong>
              </li>
            </ul>
          }

          <button type="button" class="btn" (click)="tryAgain()">
            <i class="bx bx-revision" aria-hidden="true"></i>
            Tentar novamente
          </button>
        </div>
      </div>

      <div class="toggle-panel">
        <i class="bx bx-block panel-icon" aria-hidden="true"></i>
        <h1>ACESSO BLOQUEADO (IMPOSTOR DETECTADO)</h1>
        <p>{{ attempt?.result?.message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .toggle-panel h1 {
      font-size: 26px;
    }
  `]
})
export class BlockedComponent {
  private readonly authService = inject(AuthService);
  private readonly captureService = inject(KeystrokeCaptureService);
  private readonly router = inject(Router);

  // Cópia tirada ao abrir a tela: a página continua exibindo os dados enquanto "Tentar novamente" limpa o estado.
  readonly attempt: BlockedAttempt | null = this.authService.blockedAttempt();

  get averageHoldLabel(): string {
    const averageHold = this.attempt?.result.attemptAverageHoldTimeMs;
    return averageHold === undefined ? '—' : `${averageHold} ms`;
  }

  tryAgain(): void {
    this.authService.clearBlockedAttempt();
    this.captureService.stopRecording();
    this.captureService.reset();
    this.router.navigate(['/login']);
  }
}
