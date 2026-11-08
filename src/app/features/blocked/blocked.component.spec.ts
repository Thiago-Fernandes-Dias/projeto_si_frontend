import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { BlockedComponent } from './blocked.component';
import { AuthService } from '../../core/services/auth.service';
import { KeystrokeCaptureService } from '../../core/services/keystroke-capture.service';
import { BlockedAttempt } from '../../core/models/user.model';

describe('BlockedComponent', () => {
  let fixture: ComponentFixture<BlockedComponent>;
  let element: HTMLElement;
  let authService: AuthService;
  let router: Router;

  const impostorAttempt: BlockedAttempt = {
    username: 's002_cmu',
    result: {
      decision: 'IMPOSTOR',
      confidenceScore: 0.336,
      thresholdScore: 0.75,
      inferenceTimeMs: 12.8,
      message:
        'Acesso bloqueado: o ritmo temporal de digitação diverge significativamente do perfil legítimo.',
      attemptAverageHoldTimeMs: 207
    }
  };

  async function createComponent(attempt: BlockedAttempt): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [BlockedComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.registerBlockedAttempt(attempt);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(BlockedComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  it('deve mostrar o título e a mensagem da API no painel vermelho', async () => {
    await createComponent(impostorAttempt);
    const panel = element.querySelector('.container.danger .toggle-panel');

    expect(panel?.querySelector('h1')?.textContent).toContain('ACESSO BLOQUEADO (IMPOSTOR DETECTADO)');
    expect(panel?.textContent).toContain(
      'Acesso bloqueado: o ritmo temporal de digitação diverge significativamente do perfil legítimo.'
    );
  });

  it('deve mostrar as métricas da tentativa no lugar dos dados da sessão', async () => {
    await createComponent(impostorAttempt);
    const rows = Array.from(element.querySelectorAll('.details-list li')).map((row) => [
      row.querySelector('span')?.textContent?.trim(),
      row.querySelector('strong')?.textContent?.trim()
    ]);

    expect(rows).toEqual([
      ['Grau de Confiança', '33.6%'],
      ['Limiar de Decisão', '75%'],
      ['Tempo de Inferência', '12.8 ms'],
      ['Hold Médio', '207 ms']
    ]);
    expect(element.textContent).toContain('s002_cmu');
  });

  it('deve mostrar um traço quando a API não informar o hold médio', async () => {
    await createComponent({
      ...impostorAttempt,
      result: { ...impostorAttempt.result, attemptAverageHoldTimeMs: undefined }
    });

    expect(element.querySelectorAll('.details-list li')[3].textContent).toContain('—');
  });

  it('deve descartar a tentativa, apagar a senha e voltar ao login em "Tentar novamente"', async () => {
    await createComponent(impostorAttempt);
    const captureService = TestBed.inject(KeystrokeCaptureService);
    captureService.startRecording();
    captureService.currentText.set('.tie5Roanl');

    (element.querySelector('button') as HTMLButtonElement).click();

    expect(authService.blockedAttempt()).toBeNull();
    expect(captureService.currentText()).toBe('');
    expect(captureService.isRecording()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
