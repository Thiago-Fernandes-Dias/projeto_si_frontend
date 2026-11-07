export interface RawKeyEvent {
  key: string;
  code: string;
  pressTime: number;
  releaseTime?: number;
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
}
