import { AuthenticationResponse, KeystrokeSample } from './keystroke.model';

export type CredentialFlow = 'registration' | 'password-change';

export interface RegisteredUser {
  username: string;
  targetPassword: string;
  flow: CredentialFlow;
  currentPassword?: string;
  isEnrolled: boolean;
  enrollmentSamples: KeystrokeSample[];
  createdAt: string;
}

export interface AuthenticatedSession {
  username: string;
  confidenceScore: number;
  authenticatedAt: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
}

export interface BlockedAttempt {
  username: string;
  result: AuthenticationResponse;
}
