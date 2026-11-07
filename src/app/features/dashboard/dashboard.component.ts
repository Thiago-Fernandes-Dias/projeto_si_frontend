import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { BiometricApiService } from '../../core/services/biometric-api.service';
import { AlgorithmOption, KeystrokeSample } from '../../core/models/keystroke.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <div>
          <h2>Painel de Avaliação Biométrico (Dashboard)</h2>
          <p class="subtitle">
            Análise detalhada do perfil temporal de digitação, amostras coletadas e modelos de aprendizado.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/login" class="nav-button primary">Testar Autenticação</a>
          <a routerLink="/register" class="nav-button secondary">Novo Cadastro</a>
        </div>
      </div>

      <!-- Resumo do Perfil Atual -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Usuário Ativo</span>
          <span class="stat-value">{{ userSession.currentUser()?.username || 'N/A' }}</span>
          <span class="stat-sub">Identificador do sujeito</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Senha de Referência</span>
          <span class="stat-value code-font">{{ userSession.currentUser()?.targetPassword || '.tie5Roanl' }}</span>
          <span class="stat-sub">{{ (userSession.currentUser()?.targetPassword || '').length }} caracteres</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Amostras Coletadas</span>
          <span class="stat-value" [class.success]="userSession.isEnrollmentComplete()">
            {{ userSession.currentRepetitionCount() }} / 5
          </span>
          <span class="stat-sub">
            {{ userSession.isEnrollmentComplete() ? 'Calibração Concluída' : 'Coleta Pendente' }}
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Algoritmo Recomendado</span>
          <span class="stat-value highlight">Random Forest (HPO)</span>
          <span class="stat-sub">Maior acurácia balanceada</span>
        </div>
      </div>

      <!-- Comparativo de Modelos de Aprendizado -->
      <div class="section-card">
        <h3>Modelos de Aprendizado de Máquina Avaliados</h3>
        <p class="section-desc">
          Comparação entre os classificadores implementados no projeto (UFABC ESZI014-17):
        </p>

        <div class="algorithms-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Algoritmo</th>
                <th>Estratégia</th>
                <th>Hiperparâmetros Chave</th>
                <th>Métrica Esperada</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Random Forest</strong></td>
                <td><span class="badge hpo">HPO por Usuário</span></td>
                <td><code>n_estimators, max_features, criterion</code></td>
                <td>Menor FRR e FAR</td>
              </tr>
              <tr>
                <td><strong>Random Forest</strong></td>
                <td><span class="badge baseline">Baseline</span></td>
                <td>Padrão scikit-learn</td>
                <td>Referência inicial</td>
              </tr>
              <tr>
                <td><strong>k-NN</strong></td>
                <td><span class="badge hpo">HPO por Usuário</span></td>
                <td><code>n_neighbors, weights, metric, p</code></td>
                <td>Sensível à distância euclidiana</td>
              </tr>
              <tr>
                <td><strong>Multi-Layer Perceptron (MLP)</strong></td>
                <td><span class="badge hpo">HPO por Usuário</span></td>
                <td><code>hidden_layer_sizes, solver, alpha</code></td>
                <td>Fronteiras não lineares</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Análise de Amostras Coletadas -->
      <div class="section-card">
        <h3>Vetor de Características das Amostras Coletadas</h3>
        @if (userSession.enrollmentSamples().length > 0) {
          <div class="samples-grid">
            @for (sample of userSession.enrollmentSamples(); track sample.repetition) {
              <div class="sample-chip">
                <div class="chip-header">
                  <strong>Amostra #{{ sample.repetition }}</strong>
                  <span>{{ sample.totalDurationMs }} ms total</span>
                </div>
                <div class="chip-features">
                  @for (item of getTopFeatures(sample); track item.key) {
                    <div class="feature-row">
                      <span class="feat-name">{{ item.key }}:</span>
                      <span class="feat-val">{{ item.value }}s</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">
            <p>Nenhuma amostra coletada para o usuário atual nesta sessão.</p>
            <a routerLink="/enrollment" class="nav-button primary">Iniciar Coleta de 5 Amostras</a>
          </div>
        }
      </div>

      <!-- Especificação do Benchmark CMU -->
      <div class="section-card">
        <h3>Benchmark CMU (DSL-StrongPasswordData.csv)</h3>
        <p class="section-desc">
          O benchmark CMU monitora 31 variáveis temporais para a sequência fixa <code>.tie5Roanl</code> + <code>Return</code>:
        </p>
        <div class="cmu-features-badges">
          <span class="cmu-badge hold">11 Hold Times (H)</span>
          <span class="cmu-badge dd">10 Down-Down Latencies (DD)</span>
          <span class="cmu-badge ud">10 Up-Down Flight Times (UD)</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 960px;
      margin: 2rem auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;

      h2 {
        margin: 0;
        color: #0f172a;
        font-size: 1.75rem;
      }

      .subtitle {
        margin: 0.25rem 0 0;
        color: #64748b;
      }
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .nav-button {
      padding: 0.6rem 1.2rem;
      border-radius: 0.375rem;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;

      &.primary {
        background: #0284c7;
        color: #ffffff;
        &:hover { background: #0369a1; }
      }

      &.secondary {
        background: #e2e8f0;
        color: #334155;
        &:hover { background: #cbd5e1; }
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .stat-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        font-weight: 600;
      }

      .stat-value {
        font-size: 1.4rem;
        font-weight: 700;
        color: #1e293b;

        &.success {
          color: #10b981;
        }

        &.highlight {
          color: #0284c7;
          font-size: 1.2rem;
        }
      }

      .code-font {
        font-family: monospace;
      }

      .stat-sub {
        font-size: 0.8rem;
        color: #94a3b8;
      }
    }

    .section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;

      h3 {
        margin: 0 0 0.5rem;
        color: #0f172a;
      }

      .section-desc {
        margin: 0 0 1rem;
        color: #64748b;
        font-size: 0.9rem;
      }
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;

      th, td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid #f1f5f9;
      }

      th {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
      }
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;

      &.hpo {
        background: #dbeafe;
        color: #1d4ed8;
      }

      &.baseline {
        background: #f1f5f9;
        color: #64748b;
      }
    }

    .samples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }

    .sample-chip {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 1rem;

      .chip-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #334155;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .chip-features {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .feature-row {
        display: flex;
        justify-content: space-between;
        font-family: monospace;
        font-size: 0.8rem;
      }

      .feat-name {
        color: #64748b;
      }

      .feat-val {
        font-weight: 600;
        color: #0f172a;
      }
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      background: #f8fafc;
      border-radius: 0.5rem;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .cmu-features-badges {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;

      .cmu-badge {
        padding: 0.4rem 0.8rem;
        border-radius: 0.375rem;
        font-weight: 600;
        font-size: 0.85rem;

        &.hold { background: #dcfce7; color: #166534; }
        &.dd { background: #e0e7ff; color: #3730a3; }
        &.ud { background: #fef3c7; color: #92400e; }
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly userSession = inject(UserSessionService);
  private readonly biometricApi = inject(BiometricApiService);

  availableAlgorithms: AlgorithmOption[] = [];

  ngOnInit(): void {
    this.biometricApi.getAvailableAlgorithms().subscribe((algorithms) => {
      this.availableAlgorithms = algorithms;
    });
  }

  getTopFeatures(sample: KeystrokeSample): { key: string; value: number }[] {
    return Object.entries(sample.features)
      .slice(0, 5)
      .map(([key, value]) => ({ key, value }));
  }
}
