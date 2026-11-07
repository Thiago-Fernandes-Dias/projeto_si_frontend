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

export type MachineLearningAlgorithm =
  | 'RANDOM_FOREST_BASELINE'
  | 'RANDOM_FOREST_HPO'
  | 'KNN_BASELINE'
  | 'KNN_HPO'
  | 'MLP_BASELINE'
  | 'MLP_HPO';

export interface AuthenticationPayload {
  username: string;
  passwordAttempt: string;
  sample: KeystrokeSample;
  selectedAlgorithm: MachineLearningAlgorithm;
}

export interface AuthenticationResponse {
  decision: BiometricDecision;
  confidenceScore: number;
  thresholdScore: number;
  algorithm: MachineLearningAlgorithm;
  inferenceTimeMs: number;
  message: string;
  userAverageHoldTimeMs?: number;
  attemptAverageHoldTimeMs?: number;
}

export interface AlgorithmOption {
  id: MachineLearningAlgorithm;
  name: string;
  description: string;
  hasHPO: boolean;
}
