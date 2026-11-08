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
  templateUrl: './keystroke-input.component.html',
  styleUrl: './keystroke-input.component.scss'
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
