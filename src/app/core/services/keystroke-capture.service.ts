import { Injectable, signal } from '@angular/core';
import { KeystrokeFeatures, KeystrokeSample, RawKeyEvent } from '../models/keystroke.model';

@Injectable({
  providedIn: 'root'
})
export class KeystrokeCaptureService {
  private activeKeys: RawKeyEvent[] = [];
  private completedKeys: RawKeyEvent[] = [];

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
    this.activeKeys = [];
    this.completedKeys = [];
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

    // Ignora teclas modificadoras isoladas
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
      return true;
    }

    const pressTime = performance.now();
    const rawEvent: RawKeyEvent = {
      key: event.key,
      code: event.code,
      pressTime
    };

    this.activeKeys.push(rawEvent);
    this.currentText.update((text) => text + event.key);
    this.lastAnomaly.set(null);
    return true;
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
      return;
    }

    const releaseTime = performance.now();
    const matchingKeyIndex = this.activeKeys.findIndex(
      (item) => item.key === event.key && item.releaseTime === undefined
    );

    if (matchingKeyIndex !== -1) {
      const activeKey = this.activeKeys[matchingKeyIndex];
      activeKey.releaseTime = releaseTime;
      this.completedKeys.push(activeKey);
      this.activeKeys.splice(matchingKeyIndex, 1);
    }
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.reset();
    this.lastAnomaly.set('Ação de colar não permitida. Digite a senha manualmente.');
  }

  getCompletedKeys(): RawKeyEvent[] {
    return [...this.completedKeys];
  }

  computeSample(repetition: number, targetPassword?: string): KeystrokeSample {
    const rawTimings = [...this.completedKeys];
    const textEntered = this.currentText();

    if (targetPassword && textEntered !== targetPassword) {
      throw new Error(`Texto digitado não corresponde à senha esperada.`);
    }

    if (rawTimings.length === 0) {
      throw new Error('Nenhuma tecla registrada para calcular a amostra.');
    }

    const features: KeystrokeFeatures = {};

    // Hold Time (H) para cada tecla em segundos (padrão CMU)
    for (let index = 0; index < rawTimings.length; index++) {
      const current = rawTimings[index];
      const release = current.releaseTime ?? current.pressTime;
      const holdDurationSeconds = (release - current.pressTime) / 1000;
      const keyName = this.normalizeKeyName(current.key);
      features[`H.${keyName}`] = Number(holdDurationSeconds.toFixed(4));
    }

    // Down-Down (DD) e Up-Down (UD) para dígrafos consecutivos em segundos
    for (let index = 0; index < rawTimings.length - 1; index++) {
      const current = rawTimings[index];
      const next = rawTimings[index + 1];
      const currentKeyName = this.normalizeKeyName(current.key);
      const nextKeyName = this.normalizeKeyName(next.key);

      const downDownSeconds = (next.pressTime - current.pressTime) / 1000;
      const currentRelease = current.releaseTime ?? current.pressTime;
      const upDownSeconds = (next.pressTime - currentRelease) / 1000;

      features[`DD.${currentKeyName}.${nextKeyName}`] = Number(downDownSeconds.toFixed(4));
      features[`UD.${currentKeyName}.${nextKeyName}`] = Number(upDownSeconds.toFixed(4));
    }

    const firstPress = rawTimings[0].pressTime;
    const lastRelease = rawTimings[rawTimings.length - 1].releaseTime ?? rawTimings[rawTimings.length - 1].pressTime;
    const totalDurationMs = Math.max(0, lastRelease - firstPress);

    return {
      repetition,
      features,
      rawTimings,
      textEntered,
      totalDurationMs: Number(totalDurationMs.toFixed(2))
    };
  }

  private normalizeKeyName(key: string): string {
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
}
