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
  const features: string[] = [];
  for (let index = 0; index < password.length - 1; index++) {
    const currentKey = normalizeKeyName(password[index]);
    const nextKey = normalizeKeyName(password[index + 1]);

    const holdCount = featuresCounter.get(`H.${currentKey}`) ?? 0;
    features.push(`H.${currentKey}.${holdCount}`);
    featuresCounter.set(`H.${currentKey}`, holdCount + 1);

    const downDownCount = featuresCounter.get(`DD.${currentKey}.${nextKey}`) ?? 0;
    features.push(`DD.${currentKey}.${nextKey}.${downDownCount}`);
    featuresCounter.set(`DD.${currentKey}.${nextKey}`, downDownCount + 1);

    const upDownCount = featuresCounter.get(`UD.${currentKey}.${nextKey}`) ?? 0;
    features.push(`UD.${currentKey}.${nextKey}.${upDownCount}`);
    featuresCounter.set(`UD.${currentKey}.${nextKey}`, upDownCount + 1);
  }

  const lastKey = normalizeKeyName(password[password.length - 1]);
  const lastHoldCount = featuresCounter.get(`H.${lastKey}`) ?? 0;
  features.push(`H.${lastKey}.${lastHoldCount}`);
  featuresCounter.set(`H.${lastKey}`, lastHoldCount + 1);

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

  getEventKeyLog(): RawKeyEvent[] {
    return [...this.keyEventLog];
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

    if (targetPassword !== undefined && textEntered !== targetPassword) {
      throw new Error('Texto digitado não corresponde à senha esperada.');
    }

    const keyEventLogLength = this.keyEventLog.length;
    if (keyEventLogLength !== textEntered.length * 2) {
      throw new Error('Sequência de digitação inválida. Tente digitar em um ritmo mais lento');
    }

    const features: KeystrokeFeatures = {};
    const featuresCounter = new Map<string, number>();

    for (let i = 0; i < keyEventLogLength - 2; i++) {
      const first = this.keyEventLog.at(i);
      const second = this.keyEventLog.at(i + 1);
      const third = this.keyEventLog.at(i + 2);

      if (first?.eventType === 'KEY_DOWN' && second?.eventType === 'KEY_UP' && third?.eventType === 'KEY_DOWN') {
        if (i % 2 !== 0 || first.key !== second.key) {
          throw new Error('Sequência de digitação inválida. Tente digitar em um ritmo mais lento');
        }

        const currentKey = normalizeKeyName(first.key);
        const nextKey = normalizeKeyName(third.key);

        const holdTime = Number(((second.timestamp - first.timestamp) / 1000).toFixed(4));
        const ddTime = Number(((third.timestamp - first.timestamp) / 1000).toFixed(4));
        const udTime = Number(((third.timestamp - second.timestamp) / 1000).toFixed(4));

        const holdTimeFeatCount = featuresCounter.get(`H.${currentKey}`) ?? 0;
        featuresCounter.set(`H.${currentKey}`, holdTimeFeatCount + 1);
        features[`H.${currentKey}.${holdTimeFeatCount}`] = holdTime;

        const ddTimeFeatCount = featuresCounter.get(`DD.${currentKey}.${nextKey}`) ?? 0;
        featuresCounter.set(`DD.${currentKey}.${nextKey}`, ddTimeFeatCount + 1);
        features[`DD.${currentKey}.${nextKey}.${ddTimeFeatCount}`] = ddTime;

        const udTimeFeatCount = featuresCounter.get(`UD.${currentKey}.${nextKey}`) ?? 0;
        featuresCounter.set(`UD.${currentKey}.${nextKey}`, udTimeFeatCount + 1);
        features[`UD.${currentKey}.${nextKey}.${udTimeFeatCount}`] = udTime;
      } else if (first?.eventType === 'KEY_UP' && second?.eventType === 'KEY_DOWN' && third?.eventType === 'KEY_UP') {
        if (i % 2 !== 1 || second.key !== third.key) {
          throw new Error('Sequência de digitação inválida. Tente digitar em um ritmo mais lento');
        }

        if (i === keyEventLogLength - 3) {
          const lastKey = normalizeKeyName(second.key);
          const holdTime = Number(((third.timestamp - second.timestamp) / 1000).toFixed(4));
          const holdTimeFeatCount = featuresCounter.get(`H.${lastKey}`) ?? 0;
          featuresCounter.set(`H.${lastKey}`, holdTimeFeatCount + 1);
          features[`H.${lastKey}.${holdTimeFeatCount}`] = holdTime;
        }
      } else {
        throw new Error('Sequência de digitação inválida. Tente digitar em um ritmo mais lento');
      }
    }

    const firstEvent = this.keyEventLog.at(0);
    const lastEvent = this.keyEventLog.at(-1);
    const totalDurationMs =
      firstEvent && lastEvent ? Math.max(0, lastEvent.timestamp - firstEvent.timestamp) : 0;

    return {
      repetition,
      features,
      rawTimings: [...this.keyEventLog],
      textEntered,
      totalDurationMs: Number(totalDurationMs.toFixed(2))
    };
  }
}
