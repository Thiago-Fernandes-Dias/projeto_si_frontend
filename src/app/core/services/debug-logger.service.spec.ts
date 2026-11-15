import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { DebugLoggerService, StructuredDebugLogEntry } from './debug-logger.service';

describe('DebugLoggerService', () => {
  let service: DebugLoggerService;
  let runtimeConfig: RuntimeConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DebugLoggerService);
    runtimeConfig = TestBed.inject(RuntimeConfigService);
  });

  it('não deve emitir console.debug quando debugLogsEnabled for false (produção)', () => {
    runtimeConfig.setDebugLogsEnabled(false);
    const debugSpy = spyOn(console, 'debug');

    service.debug('login', 'login_attempt_started', { username: 'ana' }, 'corr-1');

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('deve emitir JSON estruturado com correlação e mascarar campos sensíveis quando habilitado', () => {
    runtimeConfig.setDebugLogsEnabled(true);
    const debugSpy = spyOn(console, 'debug');

    service.withCorrelation('corr-abc-77', () => {
      service.debug('register', 'register_submitted', {
        username: 'ana',
        passwordLength: 10,
        targetPassword: 'plaintext-secret',
        accessToken: 'jwt-secret',
        features: 'H.a.0'
      });
    });

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const [prefix, serialized] = debugSpy.calls.mostRecent().args as [string, string];
    expect(prefix).toBe('[SI-DEBUG]');

    const parsed = JSON.parse(serialized) as StructuredDebugLogEntry;
    expect(parsed.level).toBe('DEBUG');
    expect(parsed.service).toBe('projeto_si_frontend');
    expect(parsed.flow).toBe('register');
    expect(parsed.event).toBe('register_submitted');
    expect(parsed.correlationId).toBe('corr-abc-77');
    expect(parsed.data?.['username']).toBe('ana');
    expect(parsed.data?.['passwordLength']).toBe(10);
    expect(parsed.data?.['targetPassword']).toBe('[REDACTED]');
    expect(parsed.data?.['accessToken']).toBe('[REDACTED]');
    expect(parsed.data?.['features']).toBe('[REDACTED]');
  });
});
