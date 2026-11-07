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

  it('deve alternar a visibilidade da senha ao clicar no botão', () => {
    expect(component.showPassword).toBeFalse();
    component.toggleVisibility();
    expect(component.showPassword).toBeTrue();
    component.toggleVisibility();
    expect(component.showPassword).toBeFalse();
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
