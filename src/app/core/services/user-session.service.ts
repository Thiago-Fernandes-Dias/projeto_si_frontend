import { Injectable, signal, computed } from '@angular/core';
import { KeystrokeSample } from '../models/keystroke.model';
import { RegisteredUser } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private readonly defaultPassword = '.tie5Roanl';
  private readonly targetUser = signal<RegisteredUser | null>({
    username: 's002_cmu',
    targetPassword: this.defaultPassword,
    isEnrolled: true,
    enrollmentSamples: [],
    createdAt: new Date().toISOString()
  });

  readonly currentUser = computed(() => this.targetUser());
  readonly enrollmentSamples = signal<KeystrokeSample[]>([]);

  readonly currentRepetitionCount = computed(() => this.enrollmentSamples().length);
  readonly isEnrollmentComplete = computed(() => this.enrollmentSamples().length >= 5);

  registerUser(username: string, targetPassword: string): void {
    const newUser: RegisteredUser = {
      username,
      targetPassword,
      isEnrolled: false,
      enrollmentSamples: [],
      createdAt: new Date().toISOString()
    };
    this.targetUser.set(newUser);
    this.enrollmentSamples.set([]);
  }

  addEnrollmentSample(sample: KeystrokeSample): number {
    this.enrollmentSamples.update((current) => [...current, sample]);
    const updatedUser = this.targetUser();
    if (updatedUser && this.enrollmentSamples().length >= 5) {
      this.targetUser.set({
        ...updatedUser,
        isEnrolled: true,
        enrollmentSamples: this.enrollmentSamples()
      });
    }
    return this.enrollmentSamples().length;
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
