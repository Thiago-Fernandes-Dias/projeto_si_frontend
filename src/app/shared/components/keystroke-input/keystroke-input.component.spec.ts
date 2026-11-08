import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeystrokeInputComponent } from './keystroke-input.component';
import { KeystrokeCaptureService } from '../../../core/services/keystroke-capture.service';

describe('KeystrokeInputComponent', () => {
  let component: KeystrokeInputComponent;
  let fixture: ComponentFixture<KeystrokeInputComponent>;
  let captureService: KeystrokeCaptureService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeystrokeInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KeystrokeInputComponent);
    component = fixture.componentInstance;
    captureService = TestBed.inject(KeystrokeCaptureService);
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve alternar a visibilidade da senha ao clicar no botão usando ícone de olho', () => {
    const iconElement = (fixture.nativeElement as HTMLElement).querySelector('.visibility-toggle-button i');
    expect(component.showPassword).toBeFalse();
    expect(iconElement?.classList.contains('bx-hide')).toBeTrue();
    expect(iconElement?.classList.contains('bxs-lock-alt')).toBeFalse();

    component.toggleVisibility();
    fixture.detectChanges();

    expect(component.showPassword).toBeTrue();
    expect(iconElement?.classList.contains('bx-show')).toBeTrue();
    expect(iconElement?.classList.contains('bx-hide')).toBeFalse();

    component.toggleVisibility();
    fixture.detectChanges();

    expect(component.showPassword).toBeFalse();
    expect(iconElement?.classList.contains('bx-hide')).toBeTrue();
  });

  it('deve iniciar a gravação no foco do campo', () => {
    spyOn(captureService, 'startRecording');
    component.onFocus();
    expect(captureService.startRecording).toHaveBeenCalled();
  });

  it('deve emitir textSubmitted ao pressionar Enter com texto', () => {
    spyOn(component.textSubmitted, 'emit');
    spyOn(captureService, 'currentText').and.returnValue('senha123');

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(enterEvent, 'preventDefault');

    component.onKeyDown(enterEvent);
    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(component.textSubmitted.emit).toHaveBeenCalledWith('senha123');
  });

  it('deve repassar eventos de keydown e keyup para o KeystrokeCaptureService', () => {
    spyOn(captureService, 'handleKeyDown');
    spyOn(captureService, 'handleKeyUp');

    const keyEvent = new KeyboardEvent('keydown', { key: 'a' });
    component.onKeyDown(keyEvent);
    expect(captureService.handleKeyDown).toHaveBeenCalledWith(keyEvent);

    const upEvent = new KeyboardEvent('keyup', { key: 'a' });
    component.onKeyUp(upEvent);
    expect(captureService.handleKeyUp).toHaveBeenCalledWith(upEvent);
  });
});
