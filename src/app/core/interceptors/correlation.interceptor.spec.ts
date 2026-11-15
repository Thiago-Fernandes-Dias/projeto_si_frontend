import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { DebugLoggerService } from '../services/debug-logger.service';
import { CORRELATION_HEADER, correlationInterceptor } from './correlation.interceptor';

describe('correlationInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let debugLogger: DebugLoggerService;
  let runtimeConfig: RuntimeConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([correlationInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    debugLogger = TestBed.inject(DebugLoggerService);
    runtimeConfig = TestBed.inject(RuntimeConfigService);
    runtimeConfig.setDebugLogsEnabled(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve injetar X-Correlation-ID ativo e registrar início e conclusão em JSON', () => {
    const debugSpy = spyOn(console, 'debug');

    debugLogger.withCorrelation('corr-frontend-123', () => {
      http.post('/api/authenticate', { username: 'ana' }).subscribe();
    });

    const req = httpMock.expectOne('/api/authenticate');
    expect(req.request.headers.get(CORRELATION_HEADER)).toBe('corr-frontend-123');
    req.flush({ decision: 'GENUINE' });

    const serializedEvents = debugSpy.calls
      .allArgs()
      .map((args) => JSON.parse(args[1] as string) as { event: string; correlationId: string });
    expect(serializedEvents.some((e) => e.event === 'frontend_http_request_started' && e.correlationId === 'corr-frontend-123')).toBeTrue();
    expect(serializedEvents.some((e) => e.event === 'frontend_http_request_completed' && e.correlationId === 'corr-frontend-123')).toBeTrue();
  });

  it('não deve injetar cabeçalho nem emitir logs em chamadas fora de /api', () => {
    const debugSpy = spyOn(console, 'debug');

    http.get('/assets/icon.svg').subscribe();

    const req = httpMock.expectOne('/assets/icon.svg');
    expect(req.request.headers.has(CORRELATION_HEADER)).toBeFalse();
    req.flush('ok');

    expect(debugSpy).not.toHaveBeenCalled();
  });
});
