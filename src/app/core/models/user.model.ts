import { KeystrokeSample } from './keystroke.model';

export interface RegisteredUser {
  username: string;
  targetPassword: string;
  isEnrolled: boolean;
  enrollmentSamples: KeystrokeSample[];
  createdAt: string;
}

export interface RegistrationRequest {
  username: string;
  targetPassword: string;
  confirmPassword: string;
}

export interface AuthenticatedSession {
  username: string;
  confidenceScore: number;
  authenticatedAt: string;
}
