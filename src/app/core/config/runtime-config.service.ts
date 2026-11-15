import { Injectable, isDevMode, signal } from '@angular/core';

export interface AppRuntimeConfig {
  readonly debugLogs?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RuntimeConfigService {
  private readonly debugLogs = signal<boolean>(isDevMode());

  readonly debugLogsEnabled = this.debugLogs.asReadonly();

  setDebugLogsEnabled(enabled: boolean): void {
    this.debugLogs.set(enabled);
  }

  async load(fetcher: typeof fetch = fetch): Promise<void> {
    try {
      const response = await fetcher('/runtime-config.json', { cache: 'no-store' });
      if (!response.ok) {
        this.debugLogs.set(isDevMode());
        return;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType && !contentType.includes('application/json') && !contentType.includes('text/plain')) {
        this.debugLogs.set(isDevMode());
        return;
      }

      const payload = (await response.json()) as AppRuntimeConfig;
      if (typeof payload?.debugLogs === 'boolean') {
        this.debugLogs.set(payload.debugLogs);
        return;
      }

      this.debugLogs.set(isDevMode());
    } catch {
      this.debugLogs.set(isDevMode());
    }
  }
}
