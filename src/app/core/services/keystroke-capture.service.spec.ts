import { TestBed } from '@angular/core/testing';
import {
  KeystrokeCaptureService,
  MAX_INTERVAL_SECONDS,
  determineExpectedIntervals,
  normalizeKeyName
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

      // 10 caracteres -> 10 H + 9 DD + 9 UD = 28 features (em ordem CMU intercalada: H, DD, UD por tecla)
      expect(intervals).toEqual([
        'H.period.0',
        'DD.period.t.0',
        'UD.period.t.0',
        'H.t.0',
        'DD.t.i.0',
        'UD.t.i.0',
        'H.i.0',
        'DD.i.e.0',
        'UD.i.e.0',
        'H.e.0',
        'DD.e.five.0',
        'UD.e.five.0',
        'H.five.0',
        'DD.five.Shift.r.0',
        'UD.five.Shift.r.0',
        'H.Shift.r.0',
        'DD.Shift.r.o.0',
        'UD.Shift.r.o.0',
        'H.o.0',
        'DD.o.a.0',
        'UD.o.a.0',
        'H.a.0',
        'DD.a.n.0',
        'UD.a.n.0',
        'H.n.0',
        'DD.n.l.0',
        'UD.n.l.0',
        'H.l.0'
      ]);
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

      // O Enter que encerra a digitação é tratado pelo KeystrokeInputComponent e não entra na amostra.
      const sample = service.computeSample(1, '5R');
      expect(sample.features['H.five.0']).toBe(0.1);
      expect(sample.features['H.Shift.r.0']).toBe(0.1);
      expect(sample.features['DD.five.Shift.r.0']).toBe(0.2);
      expect(normalizeKeyName('Enter')).toBe('Return');
    });

    it('deve gerar as features na mesma ordem e com as mesmas chaves que o backend espera', () => {
      service.startRecording();
      let fakeTime = 0;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      for (const [key, code] of [['t', 'KeyT'], ['e', 'KeyE'], ['s', 'KeyS'], ['t', 'KeyT'], ['e', 'KeyE']]) {
        fakeTime += 100;
        service.handleKeyDown(new KeyboardEvent('keydown', { key, code }));
        fakeTime += 80;
        service.handleKeyUp(new KeyboardEvent('keyup', { key, code }));
      }

      const sample = service.computeSample(1, 'teste');
      expect(Object.keys(sample.features)).toEqual(determineExpectedIntervals('teste'));
    });

    it('deve aceitar maiúscula quando o Shift é solto antes da letra', () => {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft' }));
      fakeTime = 1050;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'R', code: 'KeyR', shiftKey: true }));
      fakeTime = 1100;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft' }));
      fakeTime = 1150;
      // Sem o Shift pressionado, o navegador informa o keyup como 'r' minúsculo.
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'r', code: 'KeyR' }));

      fakeTime = 1300;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'o', code: 'KeyO' }));
      fakeTime = 1400;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'o', code: 'KeyO' }));

      const sample = service.computeSample(1, 'Ro');
      expect(sample.features['H.Shift.r.0']).toBe(0.1);
      expect(sample.features['DD.Shift.r.o.0']).toBe(0.25);
      expect(sample.features['UD.Shift.r.o.0']).toBe(0.15);
      expect(sample.features['H.o.0']).toBe(0.1);
    });

    it('deve ignorar a tecla AltGraph como modificadora', () => {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'AltGraph', code: 'AltRight' }));
      fakeTime = 1050;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: '/', code: 'KeyQ' }));
      fakeTime = 1150;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: '/', code: 'KeyQ' }));
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'AltGraph', code: 'AltRight' }));
      fakeTime = 1300;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));
      fakeTime = 1400;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));

      expect(service.currentText()).toBe('/a');
      expect(service.computeSample(1, '/a').features['H./.0']).toBe(0.1);
    });
  });

  describe('Limite de 5 segundos aceito pelo backend', () => {
    function typeTwoKeys(holdMs: number, pauseMs: number): void {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));
      fakeTime += holdMs;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));
      fakeTime += pauseMs;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'b', code: 'KeyB' }));
      fakeTime += 100;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'b', code: 'KeyB' }));
    }

    it('deve recusar intervalo entre teclas acima de 5 segundos', () => {
      typeTwoKeys(100, 5000);

      expect(MAX_INTERVAL_SECONDS).toBe(5);
      expect(() => service.computeSample(1, 'ab')).toThrowError(/mais de 5 segundos/);
    });

    it('deve recusar tecla segurada por mais de 5 segundos', () => {
      typeTwoKeys(5001, 100);

      expect(() => service.computeSample(1, 'ab')).toThrowError(/mais de 5 segundos/);
    });

    it('deve aceitar intervalo de exatamente 5 segundos', () => {
      typeTwoKeys(100, 4900);

      expect(service.computeSample(1, 'ab').features['DD.a.b.0']).toBe(5);
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
        /Sequência de digitação inválida/
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
        /Sequência de digitação inválida/
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
        /Sequência de digitação inválida/
      );
    });

    it('deve rejeitar se tecla foi pressionada mas não foi liberada', () => {
      service.startRecording();
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));

      expect(() => service.computeSample(1, 'a')).toThrowError(
        /Sequência de digitação inválida/
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

    it('deve aceitar nova digitação logo depois de um Backspace, ignorando a liberação do Backspace', () => {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' }));
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'x', code: 'KeyX' }));
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace' }));
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace' }));

      fakeTime = 2000;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));
      fakeTime = 2100;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));
      fakeTime = 2300;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'b', code: 'KeyB' }));
      fakeTime = 2400;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'b', code: 'KeyB' }));

      expect(service.getEventKeyLog().length).toBe(4);
      expect(service.computeSample(1, 'ab').features['DD.a.b.0']).toBe(0.3);
    });

    it('deve ignorar keyup de tecla cujo keydown não foi registrado na captura atual', () => {
      service.startRecording();
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'z', code: 'KeyZ' }));

      expect(service.getEventKeyLog()).toEqual([]);
    });

    it('deve reiniciar o campo ao detectar tecla morta e descartar o caractere acentuado composto', () => {
      service.startRecording();
      let fakeTime = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeTime);

      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC' }));
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'c', code: 'KeyC' }));

      const result = service.handleKeyDown(new KeyboardEvent('keydown', { key: 'Dead', code: 'BracketLeft' }));
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'Dead', code: 'BracketLeft' }));
      expect(result).toBeFalse();
      expect(service.currentText()).toBe('');
      expect(service.lastAnomaly()).toContain('Acentos');

      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'á', code: 'KeyA' }));
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));
      expect(service.currentText()).toBe('');
      expect(service.getEventKeyLog()).toEqual([]);
      expect(service.lastAnomaly()).toContain('Acentos');

      fakeTime = 2000;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'o', code: 'KeyO' }));
      fakeTime = 2100;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'o', code: 'KeyO' }));
      fakeTime = 2200;
      service.handleKeyDown(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK' }));
      fakeTime = 2300;
      service.handleKeyUp(new KeyboardEvent('keyup', { key: 'k', code: 'KeyK' }));

      expect(service.lastAnomaly()).toBeNull();
      expect(service.computeSample(1, 'ok').features['H.o.0']).toBe(0.1);
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
