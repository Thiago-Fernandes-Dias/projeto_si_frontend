# Especificação de Requisitos do Sistema (Frontend Angular)
## Projeto: Autenticação por Dinâmica de Digitação (*Keystroke Dynamics*)
**Contexto Acadêmico:** UFABC — Sistemas Inteligentes (ESZI014-17)

---

## 1. Visão Geral

Este documento detalha os requisitos funcionais, não-funcionais, arquiteturais e a especificação de dados para o frontend desenvolvido em **Angular (v17+)**. O sistema implementa uma interface web para cadastro de usuários, coleta guiada de amostras de digitação (5 repetições da senha), autenticação biométrica comportamental e visualização comparativa de modelos de Aprendizado de Máquina (Random Forest, k-NN e MLP, com e sem HPO).

---

## 2. Fluxo de Interação do Usuário

```
[Tela de Cadastro] 
       │ (Cadastro com sucesso)
       ▼
[Tela de Coleta de Amostras (Enrollment)] ── (Voltar) ──► [Tela de Cadastro]
       │ (Digitar a senha exatamente 5 vezes consecutivas)
       ▼
[Envio do Lote de 5 Amostras ao Backend] ──► [Treinamento do Modelo do Usuário]
       │
       ▼
[Tela de Login Biométrico] ── (Decisão IMPOSTOR) ──► [Tela de Acesso Bloqueado] ── (Tentar novamente) ──► [Tela de Login]
       │ (Decisão GENUINE)
       ▼
[Área de Sessão Autenticada] ── (Sair) ──► [Tela de Login]
```

1. **Cadastro:** O usuário preenche seus dados (nome/identificador e define sua senha).
2. **Coleta de Amostras (Enrollment):** O usuário é automaticamente direcionado para a tela de coleta, onde deve digitar a senha cadastrada exatamente **5 vezes**.
3. **Envio e Calibração:** Ao atingir as 5 repetições válidas, o frontend computa os vetores temporais e os transmite ao backend para treinamento do classificador individual.
4. **Autenticação:** O usuário realiza login digitando sua credencial; o frontend extrai o vetor biométrico da tentativa e consulta o modelo no backend para autorizar ou bloquear a sessão. O fluxo é linear e guiado, sem menu de navegação aberto.

---

## 3. Requisitos Funcionais (RF)

### 3.1. Cadastro de Usuário
- **RF01 - Formulário de Cadastro:** A interface deve fornecer campos para identificador de usuário (usuário/e-mail/RA) e senha. A senha é digitada pelo próprio usuário, sem atalho para preencher a senha padrão do benchmark CMU.
- **RF02 - Redirecionamento Automático:** Concluída a validação textual do cadastro com sucesso, o sistema deve direcionar o usuário imediatamente para a tela de coleta de amostras de digitação.

### 3.2. Coleta de Amostras de Digitação (*Enrollment*)
- **RF03 - Coleta de 5 Amostras:** A tela de coleta deve exigir a digitação da senha escolhida por exatamente **5 vezes** válidas.
- **RF04 - Feedback e Progresso Visual:** O sistema deve informar o progresso em tempo real (ex.: *"Amostra 1 de 5"*, *"Amostra 2 de 5"*), limpando o campo de entrada automaticamente a cada repetição concluída com sucesso.
- **RF05 - Validação Textual e Descarte de Inconsistências:** A amostra só é contabilizada se o texto digitado corresponder exatamente à senha escolhida no cadastro. Se houver discrepância de caracteres, a amostra é descartada com aviso instrutivo ao usuário.
- **RF06 - Invalidação por Correção ou Colagem:** Caso o usuário pressione teclas de correção (*Backspace*, *Delete*) ou realize colagem (*Paste*), o campo é limpo e a repetição atual deve ser reiniciada, assegurando a pureza do fluxo temporal.
- **RF07 - Submissão do Lote de Treinamento:** Ao atingir a 5ª repetição válida, o frontend monta o pacote com as 5 amostras temporais e dispara a requisição HTTP POST para a API backend.
- **RF17 - Voltar ao Cadastro:** A tela de coleta oferece um botão de voltar identificado apenas por um ícone de seta (com rótulo acessível "Voltar para o cadastro"), que encerra a captura em andamento, apaga o texto digitado e retorna à tela de cadastro. O botão fica desabilitado durante o envio do lote e depois da conclusão da coleta.

### 3.3. Captura e Extração de Características
- **RF08 - Registro Temporal de Alta Precisão:** A captura dos eventos de teclado (`keydown` e `keyup`) deve ser realizada utilizando a API `performance.now()`.
- **RF09 - Cálculo de Métricas por Tecla:** A aplicação deve gerar para cada digitação:
  - **Hold Time ($H$):** Duração da pressão da tecla ($T_{\text{keyup}} - T_{\text{keydown}}$).
  - **Down-Down ($DD$):** Latência entre a pressão da tecla atual e a próxima tecla ($T_{\text{keydown}_{i+1}} - T_{\text{keydown}_i}$).
  - **Up-Down ($UD$):** Tempo de voo entre a liberação da tecla atual e a pressão da próxima tecla ($T_{\text{keydown}_{i+1}} - T_{\text{keyup}_i}$).
  - Captura opcional/padronizada da tecla de submissão (`Return`/Enter) como fechamento da sequência.

### 3.4. Login e Autenticação Biométrica
- **RF10 - Tela de Autenticação:** Campo de identificação e campo de senha monitorado por serviço de dinâmica de digitação, sem necessidade de configuração ou escolha manual de modelo por parte do usuário final.
- **RF11 - Consulta de Inferência Automática:** Envio assíncrono do vetor de características da digitação para classificação direta no backend utilizando o modelo calibrado do usuário.
- **RF12 - Decisão de Acesso:** Apresentação clara do resultado retornado pela inteligência artificial:
  - **Acesso Permitido:** Identidade biométrica compatível (Usuário Genuíno).
  - **Acesso Bloqueado:** Senha textual correta, mas padrão de ritmo classificado como Impostor.
  - **Credenciais Inválidas:** Senha textual incorreta.

### 3.5. Sessão Autenticada
- **RF13 - Sessão e Rota Protegida:** Quando a decisão biométrica for `GENUINE`, o frontend registra a sessão do usuário (persistida em `localStorage`) e o direciona para a rota `/session`, protegida por guard (`authGuard`). Acessos à rota sem sessão ativa são redirecionados para `/login`.
- **RF14 - Encerramento de Sessão:** A área autenticada oferece o botão "Sair", que remove a sessão, apaga a senha digitada e os tempos capturados no login (encerrando a captura) e retorna à tela de login com o campo de senha vazio.

### 3.6. Acesso Bloqueado
- **RF15 - Tela de Acesso Bloqueado:** Quando a decisão biométrica for `IMPOSTOR`, o frontend guarda a tentativa em memória (sem `localStorage`) e direciona o usuário para a rota `/blocked`, protegida pelo guard `blockedAttemptGuard`; sem uma tentativa bloqueada registrada, o acesso é redirecionado para `/login`. A tela segue o layout da sessão autenticada, com o painel lateral em vermelho deslizando para a direita, o título "ACESSO BLOQUEADO (IMPOSTOR DETECTADO)" e a mensagem retornada pela API. No lugar dos dados da sessão, exibe Grau de Confiança, Limiar de Decisão, Tempo de Inferência e Hold Médio da tentativa.
- **RF16 - Nova Tentativa:** O botão "Tentar novamente" descarta a tentativa bloqueada, apaga a senha digitada e os tempos capturados e retorna à tela de login.

---

## 4. Requisitos Não-Funcionais (RNF)

- **RNF01 - Precisão Temporal:** Resolução sub-milissegundo via `performance.now()` sem interferência de variações de NTP ou relógio local do sistema operacional.
- **RNF02 - Bloqueio de Preenchimento Automático:** Desativação mandante de gerenciadores de credenciais e autocomplete (`autocomplete="new-password"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`).
- **RNF03 - Restrição de Teclado:** A interface deve restringir o uso ou alertar explicitamente caso o acesso ocorra via teclados virtuais móveis (smartphones/tablets), mantendo a compatibilidade estrita com teclados físicos (desktop/laptop).
- **RNF04 - Desempenho do Listener:** A captura e o processamento de eventos do teclado devem executar em tempo inferior a 5 ms por evento, prevenindo travamento da UI e atraso perceptível de digitação.
- **RNF05 - Arquitetura Angular Moderna:** Uso obrigatório de Standalone Components, Angular Signals para estado reativo, tipagem estrita de modelos TypeScript e separação de responsabilidades em Services (conforme definido em [AGENTS.md](file:///Users/thiago/Repositories/projeto_si_frontend/AGENTS.md)).
- **RNF06 - Containerização com Docker:** Disponibilização de `Dockerfile` para execução da aplicação em container isolado, suportando execução de desenvolvimento e build de produção com servidor Nginx.
- **RNF07 - Automação via Makefile:** Criação de `Makefile` com comandos padronizados para instalação de dependências (`make install`), build da aplicação (`make build`), execução de testes (`make test`), inicialização do servidor de desenvolvimento local (`make dev`), construção da imagem Docker (`make docker-build`) e execução do container (`make docker-run`).
- **RNF08 - Mock API em Python/Flask:** Disponibilização de servidor Mock em Python (Flask + Flask-CORS) em pasta dedicada (`mock_api/`) para responder às requisições do frontend com dados fictícios e simulação biométrica (`/api/register`, `/api/enrollment`, `/api/authenticate`), além de configuração de proxy no Angular CLI (`proxy.conf.json`) para integração transparente em desenvolvimento.
- **RNF09 - Orquestração Multi-container com Docker Compose:** Disponibilização de arquivo `docker-compose.yml` e `mock_api/Dockerfile` para orquestração conjunta da aplicação frontend (Angular servido via Nginx) e da Mock API (Python/Flask) em containers isolados conectados por rede bridge dedicada (`keystroke-network`). A configuração de proxy reverso do Nginx deve rotear chamadas `/api/` diretamente para o hostname do serviço da mock api (`http://mock-api:5000`), com dependência condicional de healthcheck.
- **RNF10 - Identidade Visual:** As telas usam um cartão branco central (cantos de 30 px) dividido em duas metades: o formulário e um painel azul (`#7494ec`) com borda curva. Fonte Poppins (Google Fonts), ícones Boxicons 2.1.4 e fundo em gradiente (`#e2e2e2` → `#c9d6ff`). Cadastro, coleta, sessão autenticada e acesso bloqueado mostram o painel à direita; o login, à esquerda. Ao entrar no cadastro, no login, na sessão autenticada ou no acesso bloqueado, o painel desliza para o seu lado, como na troca entre cadastro e login do modelo visual de referência; a coleta, que vem logo após o cadastro, não repete o movimento. Abaixo de 650 px de largura, o painel fica no topo e o formulário embaixo. As classes visuais compartilhadas ficam em `src/styles.scss`. O campo de senha do login e da coleta continua sendo o `app-keystroke-input` (RF08). Login por outras plataformas (Google, Facebook, GitHub, LinkedIn), recuperação de senha e campo de e-mail do modelo de referência ficam fora do escopo. O fluxo linear da seção 2 é mantido: o painel do cadastro não oferece atalho para o login. Os painéis do cadastro e do login exibem o nome do sistema, "Keystroke Dynamics Biometrics", e a página não tem cabeçalho no topo nem rodapé: só o cartão aparece sobre o fundo. A tela de acesso bloqueado (RF15) usa o mesmo cartão com o painel e o botão em vermelho (`#e05a5a`).

---

## 5. Especificação do Formato de Amostra e Dataset CMU

### 5.1. Colunas do Dataset CMU (*Benchmark* de Referência)
O arquivo `DSL-StrongPasswordData.csv` do benchmark CMU utiliza a senha padronizada `.tie5Roanl` finalizada pela tecla `Return` (11 teclas no total, gerando 31 features temporais):

```
subject,sessionIndex,rep,H.period,DD.period.t,UD.period.t,H.t,DD.t.i,UD.t.i,H.i,DD.i.e,UD.i.e,H.e,DD.e.five,UD.e.five,H.five,DD.five.Shift.r,UD.five.Shift.r,H.Shift.r,DD.Shift.r.o,UD.Shift.r.o,H.o,DD.o.a,UD.o.a,H.a,DD.a.n,UD.a.n,H.n,DD.n.l,UD.n.l,H.l,DD.l.Return,UD.l.Return,H.Return
```

#### Descrição dos Campos:
1. **Metadados:**
   - `subject`: Identificador do usuário (ex.: `s002`).
   - `sessionIndex`: Índice da sessão de coleta (no contexto da aplicação web, sessão inicial de enrollment = `1`).
   - `rep`: Índice da repetição realizada pelo usuário (de `1` a `5`).
2. **Variáveis de Duração de Pressão (Hold Time - 11 colunas):**
   - `H.period`, `H.t`, `H.i`, `H.e`, `H.five`, `H.Shift.r`, `H.o`, `H.a`, `H.n`, `H.l`, `H.Return`.
3. **Variáveis de Latência Tecla a Tecla (Down-Down - 10 colunas):**
   - `DD.period.t`, `DD.t.i`, `DD.i.e`, `DD.e.five`, `DD.five.Shift.r`, `DD.Shift.r.o`, `DD.o.a`, `DD.a.n`, `DD.n.l`, `DD.l.Return`.
4. **Variáveis de Tempo de Voo (Up-Down - 10 colunas):**
   - `UD.period.t`, `UD.t.i`, `UD.i.e`, `UD.e.five`, `UD.five.Shift.r`, `UD.Shift.r.o`, `UD.o.a`, `UD.a.n`, `UD.n.l`, `UD.l.Return`.

*Nota:* Os valores no benchmark CMU estão expressos em **segundos** com quatro casas decimais (ex.: `0.1491` s = `149.1` ms).

---

### 5.2. Exemplo de Linha de Dados no Formato CMU

| Campo | Exemplo Valor | Descrição |
|---|---|---|
| `subject` | `user_thiago` | Identificador do usuário |
| `sessionIndex` | `1` | Sessão de cadastro |
| `rep` | `1` | Primeira das 5 repetições |
| `H.period` | `0.1491` | Hold do '.' (149.1 ms) |
| `DD.period.t` | `0.3979` | Intervalo do '.' até 't' (397.9 ms) |
| `UD.period.t` | `0.2488` | Voo da liberação do '.' até o 't' (248.8 ms) |
| `H.t` | `0.1069` | Hold do 't' (106.9 ms) |
| `...` | `...` | Demais combinações de dígrafos |
| `H.Return` | `0.0742` | Hold do Enter (74.2 ms) |

---

### 5.3. Formato do Payload JSON Transmitido pelo Frontend Angular ao Backend

Quando o usuário conclui as 5 repetições na tela de coleta, o frontend envia uma requisição `POST /api/enrollment` com a carga estruturada:

```json
{
  "username": "thiago_dias",
  "passwordLength": 10,
  "samplesCount": 5,
  "samples": [
    {
      "repetition": 1,
      "features": {
        "H.period": 0.1491,
        "DD.period.t": 0.3979,
        "UD.period.t": 0.2488,
        "H.t": 0.1069,
        "DD.t.i": 0.1674,
        "UD.t.i": 0.0605,
        "H.i": 0.1169,
        "DD.i.e": 0.2212,
        "UD.i.e": 0.1043,
        "H.e": 0.1417,
        "DD.e.five": 1.1885,
        "UD.e.five": 1.0468,
        "H.five": 0.1146,
        "DD.five.Shift.r": 1.6055,
        "UD.five.Shift.r": 1.4909,
        "H.Shift.r": 0.1067,
        "DD.Shift.r.o": 0.7590,
        "UD.Shift.r.o": 0.6523,
        "H.o": 0.1016,
        "DD.o.a": 0.2136,
        "UD.o.a": 0.1120,
        "H.a": 0.1349,
        "DD.a.n": 0.1484,
        "UD.a.n": 0.0135,
        "H.n": 0.0932,
        "DD.n.l": 0.3515,
        "UD.n.l": 0.2583,
        "H.l": 0.1338,
        "DD.l.Return": 0.3509,
        "UD.l.Return": 0.2171,
        "H.Return": 0.0742
      },
      "rawTimings": [
        { "key": ".", "pressTime": 1024.12, "releaseTime": 1173.22 },
        { "key": "t", "pressTime": 1422.02, "releaseTime": 1528.92 }
      ]
    },
    {
      "repetition": 2,
      "features": { "...": "..." }
    },
    {
      "repetition": 3,
      "features": { "...": "..." }
    },
    {
      "repetition": 4,
      "features": { "...": "..." }
    },
    {
      "repetition": 5,
      "features": { "...": "..." }
    }
  ]
}
```

---

## 6. Arquitetura e Estrutura do Frontend Angular

```
src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts             # Bloqueia /session sem sessão ativa e redireciona para /login
│   │   └── blocked-attempt.guard.ts  # Libera /blocked só depois de uma tentativa IMPOSTOR
│   ├── models/
│   │   ├── keystroke.model.ts        # Tipos para eventos, features H/DD/UD e amostras
│   │   └── user.model.ts             # Modelos de usuário e autenticação
│   └── services/
│       ├── keystroke-capture.service.ts # Captura keydown/keyup e calcula H, DD, UD
│       ├── biometric-api.service.ts     # Comunicação com endpoints /register, /enrollment, /authenticate
│       └── auth.service.ts              # Sessão autenticada (localStorage), logout e última tentativa bloqueada
├── features/
│   ├── register/                     # Tela 1: Cadastro de usuário
│   │   └── register.component.ts
│   ├── enrollment/                   # Tela 2: Coleta obrigatória de 5 amostras
│   │   └── enrollment.component.ts
│   ├── login/                        # Tela 3: Login com autenticação biométrica
│   │   └── login.component.ts
│   ├── session/                      # Tela 4: Área de sessão autenticada (rota /session)
│   └── blocked/                      # Tela 5: Acesso bloqueado após decisão IMPOSTOR (rota /blocked)
└── shared/
    └── components/
        └── keystroke-input/          # Input reutilizável com escuta de performance.now()
src/styles.scss                       # Classes visuais compartilhadas (cartão, painel, campos, botões) do RNF10
mock_api/
├── Dockerfile                        # Containerização da Mock API Python
├── app.py                            # Servidor Mock Flask com endpoints /api/*
├── requirements.txt                  # Dependências Python (flask, flask-cors)
└── test_app.py                       # Testes automatizados da Mock API
docker-compose.yml                    # Orquestração multi-container do frontend e mock-api
```

---

## 7. Governança e Histórico de Revisões

Este documento segue as diretrizes estabelecidas no [AGENTS.md](file:///Users/thiago/Repositories/projeto_si_frontend/AGENTS.md) e deve ser atualizado obrigatoriamente a cada nova solicitação de funcionalidade ou alteração de escopo.

| Versão | Data | Autor / Agente | Descrição das Modificações |
|---|---|---|---|
| `1.0.0` | 2026-11-07 | Thiago Dias / Antigravity | Versão inicial dos requisitos de Keystroke Dynamics e arquitetura Angular. |
| `1.1.0` | 2026-11-07 | Thiago Dias / Antigravity | Integração do fluxo de cadastro com coleta de 5 amostras obrigatórias, mapeamento do benchmark CMU (`DSL-StrongPasswordData.csv`), definição do payload JSON e governança via `AGENTS.md`. |
| `1.2.0` | 2026-11-07 | Thiago Dias / Antigravity | Inclusão dos requisitos de infraestrutura: Dockerfile (containerização) e Makefile para automação de build, testes e execução em modo de desenvolvimento. |
| `1.3.0` | 2026-11-07 | Thiago Dias / Antigravity | Simplificação de interface: remoção da Dashboard, remoção dos links da barra de navegação global (fluxo linear guiado Cadastro -> Coleta -> Login) e remoção da escolha manual de algoritmos na tela de login. |
| `1.4.0` | 2026-11-07 | Thiago Dias / Antigravity | Criação da Mock API em Python/Flask na pasta dedicada `mock_api/` e configuração de proxy no frontend Angular para resolução de chamadas `/api/*`. |
| `1.5.0` | 2026-11-07 | Thiago Dias / Antigravity | Remoção de qualquer menção ou endpoint de listagem de algoritmos na Mock API e no serviço do frontend. |
| `1.6.0` | 2026-11-07 | Thiago Dias / Antigravity | Orquestração multi-container com Docker Compose (`docker-compose.yml`), containerização da Mock API com `mock_api/Dockerfile` e integração Nginx apontando para `http://mock-api:5000`. |
| `1.7.0` | 2026-11-07 | Júlia Vital | Inclusão de sessão autenticada com rota protegida por guard e logout (RF13, RF14). |
| `1.7.1` | 2026-11-07 | Júlia Vital | O botão "Sair" passa a apagar a senha digitada e encerrar a captura de digitação (RF14). |
| `1.8.0` | 2026-11-07 | Júlia Vital | Nova identidade visual (RNF10): cartão com formulário e painel azul deslizante, Poppins e Boxicons, sem login por outras plataformas. |
| `1.8.1` | 2026-11-07 | Júlia Vital | Remoção do cabeçalho do topo e do rodapé; o nome do sistema passa a aparecer nos painéis do cadastro e do login (RNF10). |
| `1.8.2` | 2026-11-07 | Júlia Vital | Remoção do atalho "Usar padrão CMU (.tie5Roanl)" da tela de cadastro (RF01). |
| `1.9.0` | 2026-11-07 | Júlia Vital | Tela de acesso bloqueado após decisão IMPOSTOR, com painel vermelho, métricas da tentativa e botão "Tentar novamente" (RF15, RF16). |
| `1.9.1` | 2026-11-07 | Júlia Vital | O painel azul da sessão autenticada passa para a direita e desliza ao entrar após o acesso permitido (RNF10). |
| `1.10.0` | 2026-11-07 | Júlia Vital | Botão de voltar (ícone de seta) na tela de coleta, retornando ao cadastro (RF17). |
