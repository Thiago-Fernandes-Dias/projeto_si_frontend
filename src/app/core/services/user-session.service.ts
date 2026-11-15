import { Injectable, computed, inject, signal } from '@angular/core';
import { KeystrokeSample } from '../models/keystroke.model';
import { RegisteredUser } from '../models/user.model';
import { DebugLoggerService } from './debug-logger.service';

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private readonly debugLogger = inject(DebugLoggerService);
  private readonly targetUser = signal<RegisteredUser | null>(null);

  readonly currentUser = computed(() => this.targetUser());
  readonly enrollmentSamples = signal<KeystrokeSample[]>([]);

  readonly currentRepetitionCount = computed(() => this.enrollmentSamples().length);
  readonly isEnrollmentComplete = computed(() => this.enrollmentSamples().length >= 5);

  registerUser(username: string, targetPassword: string): void {
    const newUser: RegisteredUser = {
      username,
      targetPassword,
      flow: 'registration',
      isEnrolled: false,
      enrollmentSamples: [],
      createdAt: new Date().toISOString()
    };
    this.targetUser.set(newUser);
    this.enrollmentSamples.set([]);
    this.debugLogger.debug('register', 'user_session_initialized', {
      username,
      passwordLength: targetPassword.length
    });
  }

  // A coleta seguinte (/enrollment) captura a nova senha, que vira a targetPassword.
  startPasswordChange(username: string, currentPassword: string, newPassword: string): void {
    this.targetUser.set({
      username,
      targetPassword: newPassword,
      flow: 'password-change',
      currentPassword,
      isEnrolled: false,
      enrollmentSamples: [],
      createdAt: new Date().toISOString()
    });
    this.enrollmentSamples.set([]);
    this.debugLogger.debug('password-change', 'user_session_password_change_started', {
      username,
      newPasswordLength: newPassword.length
    });
  }

  addEnrollmentSample(sample: KeystrokeSample): number {
    this.enrollmentSamples.update((current) => [...current, sample]);
    const total = this.enrollmentSamples().length;
    const updatedUser = this.targetUser();
    if (updatedUser && total >= 5) {
      this.targetUser.set({
        ...updatedUser,
        isEnrolled: true,
        enrollmentSamples: this.enrollmentSamples()
      });
    }
    this.debugLogger.debug('enrollment', 'user_session_sample_added', {
      username: updatedUser?.username,
      repetition: sample.repetition,
      totalSamples: total,
      enrollmentComplete: total >= 5
    });
    return total;
  }

  clearEnrollment(): void {
    this.enrollmentSamples.set([]);
    const updatedUser = this.targetUser();
    if (updatedUser) {
      this.targetUser.set({
        ...updatedUser,
        isEnrolled: false,
        enrollmentSamples: []
      });
    }
  }
}
