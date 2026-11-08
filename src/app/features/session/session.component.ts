import { Component, inject } from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [DatePipe, PercentPipe],
  templateUrl: './session.component.html',
  styleUrl: './session.component.scss'
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
