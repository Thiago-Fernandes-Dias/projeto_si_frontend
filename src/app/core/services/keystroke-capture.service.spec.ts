import { TestBed } from '@angular/core/testing';
import {
  KeystrokeCaptureService,
  determineExpectedIntervals
} from './keystroke-capture.service';

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
    expect(service.getEventKeyLog()).toEqual([]);
  });

  it('deve alterar o estado de gravação em startRecording e stopRecording', () => {
    service.startRecording();
    expect(service.isRecording()).toBeTrue();

    service.stopRecording();
    expect(service.isRecording()).toBeFalse();
  });

  describe('determineExpectedIntervals', () => {
    it('deve retornar vazio se a senha for vazia', () => {
      expect(determineExpectedIntervals('')).toEqual([]);
      expect(service.determineExpectedIntervals('')).toEqual([]);
    });

    it('deve gerar intervalos para a senha do benchmark CMU .tie5Roanl com índice sequencial 0', () => {
      const intervals = service.determineExpectedIntervals('.tie5Roanl');

      // 10 caracteres -> 10 H + 9 DD + 9 UD = 28 features
      expect(intervals.length).toBe(28);

      // Hold Times
      expect(intervals[0]).toBe('H.period.0');
      expect(intervals[1]).toBe('H.t.0');
      expect(intervals[2]).toBe('H.i.0');
      expect(intervals[3]).toBe('H.e.0');
      expect(intervals[4]).toBe('H.five.0');
      expect(intervals[5]).toBe('H.Shift.r.0');
      expect(intervals[6]).toBe('H.o.0');
      expect(intervals[7]).toBe('H.a.0');
      expect(intervals[8]).toBe('H.n.0');
      expect(intervals[9]).toBe('H.l.0');

      // Down-Down
      expect(intervals[10]).toBe('DD.period.t.0');
      expect(intervals[11]).toBe('DD.t.i.0');
      expect(intervals[12]).toBe('DD.i.e.0');
      expect(intervals[13]).toBe('DD.e.five.0');
      expect(intervals[14]).toBe('DD.five.Shift.r.0');
      expect(intervals[15]).toBe('DD.Shift.r.o.0');
      expect(intervals[16]).toBe('DD.o.a.0');
      expect(intervals[17]).toBe('DD.a.n.0');
      expect(intervals[18]).toBe('DD.n.l.0');

      // Up-Down
      expect(intervals[19]).toBe('UD.period.t.0');
      expect(intervals[20]).toBe('UD.t.i.0');
      expect(intervals[21]).toBe('UD.i.e.0');
      expect(intervals[22]).toBe('UD.e.five.0');
      expect(intervals[23]).toBe('UD.five.Shift.r.0');
      expect(intervals[24]).toBe('UD.Shift.r.o.0');
      expect(intervals[25]).toBe('UD.o.a.0');
      expect(intervals[26]).toBe('UD.a.n.0');
      expect(intervals[27]).toBe('UD.n.l.0');
    });

    it('deve diferenciar caracteres e digrafos repetidos com sufixo sequencial incremental', () => {
      // "teste": caracteres 't' (pos 0 e 3), 'e' (pos 1 e 4), 's' (pos 2)
      // Digrafos: 't.e' (pos 0 e pos 3) repetido!
      const intervals = service.determineExpectedIntervals('teste');

      // 5 caracteres -> 5 H + 4 DD + 4 UD = 13 features
      expect(intervals.length).toBe(13);

      expect(intervals).toContain('H.t.0');
      expect(intervals).toContain('H.e.0');
      expect(intervals).toContain('H.s.0');
      expect(intervals).toContain('H.t.1');
      expect(intervals).toContain('H.e.1');

      expect(intervals).toContain('DD.t.e.0');
      expect(intervals).toContain('DD.e.s.0');
      expect(intervals).toContain('DD.s.t.0');
      expect(intervals).toContain('DD.t.e.1');

      expect(intervals).toContain('UD.t.e.0');
      expect(intervals).toContain('UD.e.s.0');
      expect(intervals).toContain('UD.s.t.0');
      expect(intervals).toContain('UD.t.e.1');
    });
  });

  describe('Captura e Cálculo de Features', () => {
    it('deve registrar teclas no eventKeyLog e calcular features H, DD e UD com precisão e sufixos', () => {
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
      expect(sample.features['H.period.0']).toBe(0.15);
      expect(sample.features['H.t.0']).toBe(0.12);
      expect(sample.features['DD.period.t.0']).toBe(0.4);
      expect(sample.features['UD.period.t.0']).toBe(0.25);

      const log = service.getEventKeyLog();
      expect(log.length).toBe(4);
      expect(log[0]).toEqual({ key: '.', code: 'Period', timestamp: 1000, eventType: 'KEY_DOWN' });
      expect(log[1]).toEqual({ key: '.', code: 'Period', timestamp: 1150, eventType: 'KEY_UP' });
      expect(log[2]).toEqual({ key: 't', code: 'KeyT', timestamp: 1400, eventType: 'KEY_DOWN' });
      expect(log[3]).toEqual({ key: 't', code: 'KeyT', timestamp: 1520, eventType: 'KEY_UP' });
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
      expect(sample.features['H.five.0']).toBe(0.1);
      expect(sample.features['H.Shift.r.0']).toBe(0.1);
      expect(sample.features['H.Return.0']).toBe(0.1);
      expect(sample.features['DD.five.Shift.r.0']).toBe(0.2);
      expect(sample.features['DD.Shift.r.Return.0']).toBe(0.2);
    });
  });

  describe('Validação de Sequência e Anomalias', () => {
    it('deve rejeitar e lançar erro se o usuário segurar uma tecla e soltar somente no final', () => {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      // Tecla 1 '.' pressionada em 1000ms
      service.handleKeyDown(new KeyboardEvent('keydown', { key: '.', code: 'Period' }));

      // Tecla 2 't' pressionada em 1100ms e liberada em 1200ms (enquanto '.' continua pressionada!)
      fakeTime = 1100;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 't', code: 'KeyT' }));
      fakeTime = 1200;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 't', code: 'KeyT' }));

      // '.' liberada em 1300ms (após 't' já ter sido solta)
      fakeTime = 1300;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: '.', code: 'Period' }));

      expect(() => service.computeSample(1, '.t')).toThrowError(
        /foi liberada após a tecla seguinte|mantida pressionada/
      );
    });

    it('deve rejeitar se uma tecla for mantida pressionada durante teclas subsequentes (i+2)', () => {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      // Tecla 1 '.' pressionada em 1000ms
      service.handleKeyDown(new KeyboardEvent('keydown', { key: '.', code: 'Period' }));

      // Tecla 2 't' pressionada em 1100ms
      fakeTime = 1100;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 't', code: 'KeyT' }));

      // Tecla 3 'i' pressionada em 1200ms enquanto '.' ainda está pressionada!
      fakeTime = 1200;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'i', code: 'KeyI' }));

      fakeTime = 1250;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: '.', code: 'Period' }));
      fakeTime = 1300;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 't', code: 'KeyT' }));
      fakeTime = 1350;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'i', code: 'KeyI' }));

      expect(() => service.computeSample(1, '.ti')).toThrowError(
        /permaneceu pressionada durante a digitação de teclas subsequentes/
      );
    });

    it('deve rejeitar tecla repetida consecutiva pressionada antes da liberação da anterior', () => {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));
      fakeTime = 1100;
      // Pressiona 'a' de novo sem ter feito keyup do primeiro 'a'
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));
      fakeTime = 1200;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));
      fakeTime = 1300;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));

      expect(() => service.computeSample(1, 'aa')).toThrowError(
        /tecla repetida "a" foi pressionada antes de sua liberação/
      );
    });

    it('deve rejeitar se tecla foi pressionada mas não foi liberada', () => {
      service.startRecording();
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));

      expect(() => service.computeSample(1, 'a')).toThrowError(
        /foi pressionada mas não foi liberada/
      );
    });

    it('deve rejeitar se a senha digitada não coincidir com a esperada', () => {
      service.startRecording();
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));

      expect(() => service.computeSample(1, 'b')).toThrowError(
        /Texto digitado não corresponde à senha esperada/
      );
    });

    it('deve detectar Backspace, reiniciar estado e registrar anomalia', () => {
      service.startRecording();
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
      expect(service.currentText()).toBe('a');

      const result = service.handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));
      expect(result).toBeFalse();
      expect(service.currentText()).toBe('');
      expect(service.getEventKeyLog()).toEqual([]);
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
  });
});
