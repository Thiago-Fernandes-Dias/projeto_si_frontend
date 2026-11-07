import { TestBed } from '@angular/core/testing';
import { KeystrokeCaptureService } from './keystroke-capture.service';

describe('KeystrokeCaptureService', () => {
  let service: KeystrokeCaptureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KeystrokeCaptureService);
  });

  it('deve inicializar com estado limpo', () => {
    expect(service.isRecording()).toBeFalse();
    expect(service.currentText()).toBe('');
    expect(service.lastAnomaly()).toBeNull();
  });

  it('deve alterar o estado de gravação em startRecording e stopRecording', () => {
    service.startRecording();
    expect(service.isRecording()).toBeTrue();

    service.stopRecording();
    expect(service.isRecording()).toBeFalse();
  });

  it('deve registrar teclas e calcular features H, DD e UD com precisão', () => {
    service.startRecording();

    let fakeTime = 1000;
    spyOn(performance, 'now').and.callFake(() => fakeTime);

    // Tecla 1: '.'
    service.handleKeyDown(new KeyboardEvent('keydown', { key: '.', code: 'Period' }));
    fakeTime = 1150; // Hold de 150ms = 0.1500s
    service.handleKeyUp(new KeyboardEvent('keyup', { key: '.', code: 'Period' }));

    // Tecla 2: 't' (pressionada em 1400ms -> DD = 1400-1000 = 400ms = 0.4000s; UD = 1400-1150 = 250ms = 0.2500s)
    fakeTime = 1400;
    service.handleKeyDown(new KeyboardEvent('keydown', { key: 't', code: 'KeyT' }));
    fakeTime = 1520; // Hold de 120ms = 0.1200s
    service.handleKeyUp(new KeyboardEvent('keyup', { key: 't', code: 'KeyT' }));

    const sample = service.computeSample(1, '.t');

    expect(sample.repetition).toBe(1);
    expect(sample.textEntered).toBe('.t');
    expect(sample.features['H.period']).toBe(0.15);
    expect(sample.features['H.t']).toBe(0.12);
    expect(sample.features['DD.period.t']).toBe(0.4);
    expect(sample.features['UD.period.t']).toBe(0.25);
  });

  it('deve normalizar teclas especiais como 5, Enter e maiúsculas', () => {
    service.startRecording();
    let fakeTime = 2000;
    spyOn(performance, 'now').and.callFake(() => fakeTime);

    // Tecla '5'
    service.handleKeyDown(new KeyboardEvent('keydown', { key: '5', code: 'Digit5' }));
    fakeTime = 2100;
    service.handleKeyUp(new KeyboardEvent('keyup', { key: '5', code: 'Digit5' }));

    // Tecla 'R' (maiúscula)
    fakeTime = 2200;
    service.handleKeyDown(new KeyboardEvent('keydown', { key: 'R', code: 'KeyR' }));
    fakeTime = 2300;
    service.handleKeyUp(new KeyboardEvent('keyup', { key: 'R', code: 'KeyR' }));

    // Tecla 'Enter'
    fakeTime = 2400;
    service.handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
    fakeTime = 2500;
    service.handleKeyUp(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter' }));

    const sample = service.computeSample(1, '5REnter');
    expect(sample.features['H.five']).toBe(0.1);
    expect(sample.features['H.Shift.r']).toBe(0.1);
    expect(sample.features['H.Return']).toBe(0.1);
    expect(sample.features['DD.five.Shift.r']).toBe(0.2);
    expect(sample.features['DD.Shift.r.Return']).toBe(0.2);
  });

  it('deve detectar Backspace, reiniciar estado e registrar anomalia', () => {
    service.startRecording();
    service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(service.currentText()).toBe('a');

    const result = service.handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(result).toBeFalse();
    expect(service.currentText()).toBe('');
    expect(service.lastAnomaly()).toContain('Correção não permitida');
  });

  it('deve detectar teclas de navegação como anomalia', () => {
    service.startRecording();
    service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
    const result = service.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(result).toBeFalse();
    expect(service.lastAnomaly()).toContain('Navegação no texto');
  });

  it('deve interceptar evento de Paste e registrar anomalia', () => {
    service.startRecording();
    const mockPasteEvent = new ClipboardEvent('paste');
    spyOn(mockPasteEvent, 'preventDefault');

    service.handlePaste(mockPasteEvent);
    expect(mockPasteEvent.preventDefault).toHaveBeenCalled();
    expect(service.lastAnomaly()).toContain('Ação de colar não permitida');
  });

  it('deve lançar erro se a senha digitada não coincidir com a esperada', () => {
    service.startRecording();
    service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
    service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a' }));

    expect(() => service.computeSample(1, 'senha_diferente')).toThrowError(
      /Texto digitado não corresponde à senha esperada/
    );
  });
});
