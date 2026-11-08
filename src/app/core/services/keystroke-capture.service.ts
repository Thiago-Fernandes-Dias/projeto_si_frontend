import { Injectable, signal } from '@angular/core';
import {
  KeystrokeFeatures,
  KeystrokeSample,
  RawKeyEvent
} from '../models/keystroke.model';

export function normalizeKeyName(key: string): string {
  if (key === '.') {
    return 'period';
  }
  if (key === '5') {
    return 'five';
  }
  if (key === 'Enter') {
    return 'Return';
  }
  if (key.length === 1 && key >= 'A' && key <= 'Z') {
    return `Shift.${key.toLowerCase()}`;
  }
  return key;
}

export function determineExpectedIntervals(password: string): string[] {
  if (!password || password.length === 0) {
    return [];
  }

  const featuresCounter = new Map<string, number>();
  const features: string[] = []
  for (let index = 0; index < password.length - 1; index++) {
    const currentKey = normalizeKeyName(password[index]);
    const nextKey = normalizeKeyName(password[index + 1]);

    let holdCount = featuresCounter.get(`H.${currentKey}`) ?? 0;
    features.push(`H.${currentKey}.${holdCount}`);
    featuresCounter.set(`H.${currentKey}`, holdCount + 1);

    let downDownCount = featuresCounter.get(`DD.${currentKey}.${nextKey}`) ?? 0;
    features.push(`DD.${currentKey}.${nextKey}.${downDownCount}`);
    featuresCounter.set(`DD.${currentKey}.${nextKey}`, downDownCount + 1);

    let upDownCount = featuresCounter.get(`UD.${currentKey}.${nextKey}`) ?? 0;
    features.push(`UD.${currentKey}.${nextKey}.${upDownCount}`);
    featuresCounter.set(`UD.${currentKey}.${nextKey}`, upDownCount + 1);
  }

  return features;
}

@Injectable({
  providedIn: 'root'
})
export class KeystrokeCaptureService {
  private keyEventLog: RawKeyEvent[] = [];

  readonly isRecording = signal<boolean>(false);
  readonly currentText = signal<string>('');
  readonly lastAnomaly = signal<string | null>(null);

  startRecording(): void {
    this.reset();
    this.isRecording.set(true);
  }

  stopRecording(): void {
    this.isRecording.set(false);
  }

  reset(): void {
    this.keyEventLog = [];
    this.currentText.set('');
    this.lastAnomaly.set(null);
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.repeat) {
      return false;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.reset();
      this.lastAnomaly.set('Correção não permitida. O campo foi reiniciado.');
      return false;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      this.reset();
      this.lastAnomaly.set('Navegação no texto não permitida durante a coleta.');
      return false;
    }

    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
      return true;
    }

    const rawEvent: RawKeyEvent = {
      key: event.key,
      code: event.code,
      timestamp: performance.now(),
      eventType: 'KEY_DOWN'
    };

    this.keyEventLog.push(rawEvent);
    this.currentText.update((text) => text + event.key);
    this.lastAnomaly.set(null);
    return true;
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
      return;
    }

    const rawEvent: RawKeyEvent = {
      key: event.key,
      code: event.code,
      timestamp: performance.now(),
      eventType: 'KEY_UP'
    };

    this.keyEventLog.push(rawEvent);
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.reset();
    this.lastAnomaly.set('Ação de colar não permitida. Digite a senha manualmente.');
  }

  determineExpectedIntervals(password: string): string[] {
    return determineExpectedIntervals(password);
  }

  normalizeKeyName(key: string): string {
    return normalizeKeyName(key);
  }

  computeSample(repetition: number, targetPassword?: string): KeystrokeSample {
    const textEntered = this.currentText();

    if (textEntered.length === 0) {
      throw new Error('Nenhuma tecla registrada para calcular a amostra.');
    }

    if (textEntered !== targetPassword) {
      throw new Error('Texto digitado não corresponde à senha esperada.');
    }

    const features: KeystrokeFeatures = {};
    const featuresCounter = new Map<string, number>();

    let keyEventLogLength = this.keyEventLog.length;
    for (let i = 0; i < keyEventLogLength - 3 ; i++) {
      let first = this.keyEventLog.at(i);
      let second = this.keyEventLog.at(i + 1);
      let third = this.keyEventLog.at(i + 2);

      if (first?.eventType === 'KEY_DOWN' && second?.eventType === 'KEY_UP' && third?.eventType === 'KEY_DOWN') {
        let holdTime = second.timestamp - first.timestamp;
        let ddTime = third.timestamp - first.timestamp;
        let upTime = third.timestamp -second.timestamp;

        let holdTimeFeatCount = featuresCounter.get(`H.${first.key}`)
        featuresCounter.set(`H.${first.key}`, )
      }
    }

    return {
      repetition,
      features,
      rawTimings: [...this.keyEventLog],
      textEntered,
      totalDurationMs: Number(totalDurationMs.toFixed(2))
    };
  }
}
