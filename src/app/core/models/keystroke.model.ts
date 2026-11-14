export type RawEventType = 'KEY_DOWN' | 'KEY_UP';
export type KeyEventType = RawEventType;

export interface RawKeyEvent {
  key: string;
  code: string;
  timestamp: number;
  eventType: RawEventType;
}

export interface KeystrokeFeatures {
  [featureKey: string]: number;
}

export interface KeystrokeSample {
  repetition: number;
  features: KeystrokeFeatures;
  rawTimings: RawKeyEvent[];
  textEntered: string;
  totalDurationMs: number;
}

export interface EnrollmentPayload {
  username: string;
  passwordLength: number;
  samplesCount: number;
  samples: KeystrokeSample[];
}

export interface EnrollmentResponse {
  success: boolean;
  message: string;
  samplesRegistered: number;
  calculatedAverageHoldMs?: number;
}

export type BiometricDecision = 'GENUINE' | 'IMPOSTOR' | 'INVALID_CREDENTIALS';


export interface AuthenticationPayload {
  username: string;
  passwordAttempt: string;
  sample: KeystrokeSample;
}

export interface AuthenticationResponse {
  decision: BiometricDecision;
  confidenceScore: number;
  thresholdScore: number;
  inferenceTimeMs: number;
  message: string;
  userAverageHoldTimeMs?: number;
  attemptAverageHoldTimeMs?: number;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}
