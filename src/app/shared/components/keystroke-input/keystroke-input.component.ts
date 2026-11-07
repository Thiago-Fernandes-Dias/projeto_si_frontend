import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeystrokeCaptureService } from '../../../core/services/keystroke-capture.service';

@Component({
  selector: 'app-keystroke-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="keystroke-input-wrapper">
      <div class="input-container" [class.recording]="captureService.isRecording()">
        <input
          #inputElement
          [type]="showPassword ? 'text' : 'password'"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="captureService.currentText()"
          (keydown)="onKeyDown($event)"
          (keyup)="onKeyUp($event)"
          (paste)="onPaste($event)"
          (focus)="onFocus()"
          autocomplete="new-password"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          class="keystroke-field"
        />
        <button
          type="button"
          class="visibility-toggle-button"
          (click)="toggleVisibility()"
          [title]="showPassword ? 'Ocultar senha' : 'Ver senha'"
        >
          {{ showPassword ? '👁️' : '🔒' }}
        </button>
      </div>

      <div class="meta-row">
        <span class="keystroke-badge" [class.active]="captureService.isRecording()">
          {{ captureService.isRecording() ? '● Captura Ativa (performance.now)' : '○ Aguardando Foco' }}
        </span>
        <span class="key-count">
          Caracteres: {{ captureService.currentText().length }}
        </span>
      </div>

      @if (captureService.lastAnomaly(); as anomaly) {
        <div class="anomaly-alert" role="alert">
          ⚠️ {{ anomaly }}
        </div>
      }
    </div>
  `,
  styles: [`
    .keystroke-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
      border: 2px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #ffffff;
      transition: all 0.2s ease-in-out;

      &.recording {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
    }

    .keystroke-field {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: monospace;
      letter-spacing: 0.1em;
      border: none;
      outline: none;
      border-radius: 0.5rem;
      background: transparent;

      &:disabled {
        background-color: #f1f5f9;
        cursor: not-allowed;
      }
    }

    .visibility-toggle-button {
      background: none;
      border: none;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-size: 1.1rem;
      opacity: 0.7;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #64748b;
    }

    .keystroke-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #64748b;
      font-weight: 500;

      &.active {
        color: #16a34a;
      }
    }

    .key-count {
      font-family: monospace;
    }

    .anomaly-alert {
      padding: 0.5rem 0.75rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      font-size: 0.85rem;
      border-radius: 0.375rem;
    }
  `]
})
export class KeystrokeInputComponent {
  readonly captureService = inject(KeystrokeCaptureService);

  @Input() placeholder = 'Digite a senha aqui...';
  @Input() disabled = false;
  @Output() textSubmitted = new EventEmitter<string>();

  @ViewChild('inputElement') inputRef!: ElementRef<HTMLInputElement>;

  showPassword = false;

  toggleVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onFocus(): void {
    if (!this.captureService.isRecording()) {
      this.captureService.startRecording();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const currentText = this.captureService.currentText();
      if (currentText.length > 0) {
        this.textSubmitted.emit(currentText);
      }
      return;
    }

    this.captureService.handleKeyDown(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      this.captureService.handleKeyUp(event);
    }
  }

  onPaste(event: ClipboardEvent): void {
    this.captureService.handlePaste(event);
  }

  clearInput(): void {
    this.captureService.reset();
    if (this.inputRef) {
      this.inputRef.nativeElement.value = '';
      this.inputRef.nativeElement.focus();
    }
  }

  focus(): void {
    if (this.inputRef) {
      this.inputRef.nativeElement.focus();
    }
  }
}
