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
          [attr.aria-label]="showPassword ? 'Ocultar senha' : 'Ver senha'"
        >
          <i
            class="bx"
            [class.bx-show]="showPassword"
            [class.bxs-lock-alt]="!showPassword"
            aria-hidden="true"
          ></i>
        </button>
      </div>

      <div class="meta-row">
        <span class="keystroke-badge" [class.active]="captureService.isRecording()">
          {{ captureService.isRecording() ? '● Captura Ativa' : '○ Aguardando Foco' }}
        </span>
        <span class="key-count">
          Caracteres: {{ captureService.currentText().length }}
        </span>
      </div>

      @if (captureService.lastAnomaly(); as anomaly) {
        <div class="anomaly-alert" role="alert">
          <i class="bx bxs-error-circle" aria-hidden="true"></i>
          <span>{{ anomaly }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .keystroke-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      text-align: left;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
      background: #eee;
      border-radius: 8px;
      transition: box-shadow 0.2s ease-in-out;

      &.recording {
        box-shadow: 0 0 0 2px #7494ec;
      }
    }

    .keystroke-field {
      flex: 1;
      width: 100%;
      padding: 13px 8px 13px 20px;
      background: transparent;
      border: none;
      border-radius: 8px;
      outline: none;
      color: #333;
      font-family: inherit;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: 0.1em;

      &::placeholder {
        color: #888;
        font-weight: 400;
        letter-spacing: normal;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    .visibility-toggle-button {
      display: flex;
      align-items: center;
      padding: 0 20px 0 8px;
      background: none;
      border: none;
      color: #555;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #777;
    }

    .keystroke-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;

      &.active {
        color: #4a6fd6;
      }
    }

    .key-count {
      font-variant-numeric: tabular-nums;
    }

    .anomaly-alert {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 12px;
      background: #fdecec;
      color: #9b1c1c;
      font-size: 13px;
      line-height: 1.4;
      border-radius: 8px;

      i {
        flex-shrink: 0;
        font-size: 16px;
        line-height: 1.3;
      }
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
