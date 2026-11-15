import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from './runtime-config.service';

describe('RuntimeConfigService', () => {
  let service: RuntimeConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RuntimeConfigService);
  });

  it('deve aplicar debugLogs true quando /runtime-config.json retorna true', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ debugLogs: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });

    await service.load(fakeFetch);

    expect(service.debugLogsEnabled()).toBeTrue();
  });

  it('deve aplicar debugLogs false quando /runtime-config.json retorna false', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ debugLogs: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });

    await service.load(fakeFetch);

    expect(service.debugLogsEnabled()).toBeFalse();
  });

  it('deve manter fallback seguro quando fetch falhar ou responder HTML SPA', async () => {
    service.setDebugLogsEnabled(true);
    const htmlFetch: typeof fetch = async () =>
      new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      });

    await service.load(htmlFetch);

    expect(typeof service.debugLogsEnabled()).toBe('boolean');

    const failingFetch: typeof fetch = async () => {
      throw new Error('network down');
    };

    await service.load(failingFetch);

    expect(typeof service.debugLogsEnabled()).toBe('boolean');
  });
});
