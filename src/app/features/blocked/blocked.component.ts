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
  templateUrl: './blocked.component.html',
  styleUrl: './blocked.component.scss'
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
