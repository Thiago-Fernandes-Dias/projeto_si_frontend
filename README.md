# Frontend de Autenticação por Dinâmica de Digitação (*Keystroke Dynamics*)

Aplicação web desenvolvida em **Angular 18 (Standalone Components + Signals)** para cadastro de usuários, coleta guiada de amostras de digitação (5 repetições obrigatórias), troca de senha e autenticação biométrica comportamental via dinâmica de digitação. O fluxo de usuário é guiado e focado (Login ➔ Cadastro ➔ Coleta de 5 Amostras ➔ Login).

O frontend **não treina nem classifica** o padrão biométrico. Ele captura os eventos de teclado, calcula as features `H` (Hold), `DD` (Down-Down) e `UD` (Up-Down) e envia as amostras ao Backend .NET, que delega a decisão à ML API.

**Contexto Acadêmico:** UFABC — Sistemas Inteligentes (ESZI014-17)

---

## Algoritmo Biométrico Utilizado

A classificação é feita pela `projeto_si_ml_api` com o **`M2005_IDB`** (*Improved Double Parallel*, Pisani et al., IJCNN 2015):

- **Submodelo deslizante** com janela de 50 amostras genuínas recentes.
- **Submodelo crescente incremental** com estatísticas online de Welford em memória `O(1)`.
- **Escore final** pela média dos submodelos, comparado a um limiar calibrado por usuário (`min`/`min_non_outlier`, teto `0.7`).
- **Treinamento one-class**: apenas amostras genuínas do próprio usuário.

O `M2005_IDB` foi escolhido a partir de 52 experimentos nos benchmarks CMU e KeyRecs, com BACC médio `0.8445` e CMU `BACC = 0.8909` / `FRR = 15.24%` / `FAR = 6.58%`. O frontend contribui garantindo captura temporal consistente: `performance.now()`, rejeição de atalhos/correções, pareamento por tecla física e features na ordem exata da senha.

---

## 1. Pré-Requisitos e Dependências

### Cenário A: Desenvolvimento local (host)

| Ferramenta | Versão |
|---|---|
| Node.js | `18.19+`, `20.11+` ou `22+` (recomendado `22`, mesma versão do Docker) |
| npm | `9+` |
| Google Chrome / Chromium | Necessário para os testes Karma (`ChromeHeadless`) |
| Make | Opcional, para atalhos (`make test`, `make build`, etc.) |
| Backend .NET + ML API + PostgreSQL | Necessários para o fluxo completo de cadastro/login/troca de senha |

O frontend consome os endpoints `/api/*` e depende do backend em execução. A forma mais simples de subir tudo junto é usar o Docker Compose da raiz do repositório principal.

### Cenário B: Docker

| Ferramenta | Versão |
|---|---|
| Docker Engine / Docker Desktop | `20.10+` |
| Docker Compose | Plugin `docker compose` |
| Make | Opcional |

Não é necessário instalar Node.js no host: o build e o runtime ficam no container.

---

## 2. Como Executar Sem Docker

### Passo 1 — Subir Backend e ML API

Na raiz do repositório principal:

```bash
docker compose up --build
```

Isso publica o backend em `http://localhost:5001`, a ML API em `http://localhost:8000` e o próprio frontend em `http://localhost:4200`.

Para desenvolver o frontend com hot reload, mantenha backend e ML API rodando e execute o frontend localmente. Se o backend estiver no Docker (porta `5001`), ajuste `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://127.0.0.1:5001",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "info"
  }
}
```

Alternativamente, execute o backend localmente com `dotnet run`, que escuta em `http://localhost:5000` (alvo padrão do proxy).

### Passo 2 — Instalar dependências e iniciar

```bash
npm install
# ou: make install

npm start
# ou: make dev
```

Acesse **`http://localhost:4200`**. O `proxy.conf.json` repassa chamadas `/api/*` para o backend.

### Passo 3 — Testes automatizados

```bash
npm test -- --watch=false --browsers=ChromeHeadless
# ou: make test
```

### Passo 4 — Build de produção

```bash
NG_CLI_ANALYTICS=false npm run build -- --configuration production
# ou: make build
```

Os arquivos otimizados são gerados em `dist/keystroke-auth-frontend/browser`.

---

## 3. Como Executar Com Docker

### Stack completa (recomendado)

Na raiz do repositório principal:

```bash
docker compose up --build
```

O Nginx do frontend faz proxy de `/api/` para o serviço `backend:5000` na rede `keystroke-network`.

### Container isolado do frontend

```bash
docker build -t keystroke-auth-frontend .
docker run --rm -p 4200:80 --name keystroke-auth-instance keystroke-auth-frontend
# ou: make docker-build && make docker-run
```

> O container isolado espera um serviço `backend` acessível em `http://backend:5000` na rede `keystroke-network` (definido em `nginx.conf`). Para o fluxo funcional completo, use o Compose da raiz. Para desenvolvimento dentro de um container Node:

```bash
make docker-dev
```

Encerrar containers do Compose do frontend:

```bash
docker compose down
# ou: make compose-down
```

---

## 4. Resumo de Comandos do Makefile

| Comando | Descrição |
|---|---|
| `make help` | Exibe o menu com todos os comandos disponíveis |
| `make install` | Instala dependências do frontend via npm |
| `make dev` | Inicia o servidor Angular local com proxy em `http://localhost:4200` |
| `make test` | Executa a suíte de testes unitários em modo headless |
| `make build` | Compila o bundle otimizado de produção em `dist/` |
| `make docker-build` | Cria a imagem Docker de produção (`keystroke-auth-frontend`) |
| `make docker-run` | Sobe o container Docker servindo a aplicação na porta `4200` |
| `make docker-dev` | Inicia container Node interativo para desenvolvimento |
| `make compose-up` | Constrói e inicia o container frontend via Docker Compose |
| `make compose-down` | Encerra os containers orquestrados via Docker Compose |
| `make clean` | Remove as pastas `dist/` e cache `.angular/` |

---

## 5. Fluxo de Telas e Endpoints

| Rota | Tela | Endpoints usados |
|---|---|---|
| `/login` (e `/`) | Login biométrico | `POST /api/authenticate`, `GET /api/session` (guard) |
| `/register` | Cadastro | `GET /api/username-availability` |
| `/enrollment` | Coleta de 5 amostras | `POST /api/register` ou `POST /api/change-password` |
| `/change-password` | Troca de senha | — (segue para `/enrollment`) |
| `/session` | Área autenticada | `GET /api/session` (validação do JWT) |
| `/blocked` | Acesso bloqueado (IMPOSTOR) | — |

- `GET /api/username-availability?username=...` é uma pré-checagem; a unicidade é garantida novamente por `POST /api/register` (`409`).
- O JWT retornado no login `GENUINE` é validado em `GET /api/session` antes de abrir `/session`; tokens emitidos antes de uma troca de senha são recusados.
- Decisão `INVALID_CREDENTIALS` (senha errada/conta bloqueada) mantém o usuário no login com a mensagem da API; `IMPOSTOR` leva à tela `/blocked`.

---

## 6. Captura e Extração de Features

- **Captura:** eventos `keydown`/`keyup` com `performance.now()`, buffer cronológico `RawEventType` (`KEY_DOWN`/`KEY_UP`). O caractere é registrado apenas no `KEY_DOWN`.
- **Validação:** rejeita `Backspace`, `Delete`, setas/Home/End, colagem, teclas mortas (`Dead`) e teclas modificadoras. O par `KEY_DOWN`/`KEY_UP` é associado pela tecla física (`code`), não pelo caractere, para não invalidar amostras ao soltar `Shift` antes da letra.
- **Features:** para cada tecla, extrai `H` (hold), `DD` (latência entre keydowns) e `UD` (voo entre keyup e próximo keydown), com sufixo sequencial anti-colisão (`H.t.0`, `H.t.1`, `DD.t.e.0`, ...). O backend aceita `H, DD ∈ (0, 5]` s e `UD ∈ [-5, 5]` s; o frontend recusa localmente pausas acima de 5 s.
- **Envio:** o `KeystrokeSample` inclui `repetition`, `features`, `rawTimings`, `textEntered` e `totalDurationMs`. O backend usa `features`/`textEntered`/`totalDurationMs`; `rawTimings` é ignorado e nunca persistido.

---

## 7. Estrutura do Projeto e Documentação

- [requisitos.md](requisitos.md): especificação oficial de requisitos, fluxo de telas, colunas do benchmark CMU (`DSL-StrongPasswordData.csv`), formato dos payloads e regras biométricas (`H`, `DD`, `UD`).
- [AGENTS.md](AGENTS.md): diretrizes de engenharia e governança para agentes de IA.
- [`docker-compose.yml`](docker-compose.yml): orquestração do container frontend.
- [`proxy.conf.json`](proxy.conf.json): proxy reverso do Angular CLI para `/api/*`.
- `src/app/core/`: serviços de captura (`KeystrokeCaptureService`), API (`BiometricApiService`), sessão (`UserSessionService`/`AuthService`), configuração runtime, guards, interceptors e modelos tipados.
- `src/app/features/`: telas `register`, `enrollment`, `change-password`, `login`, `session` e `blocked`.
- `src/app/shared/`: componente `KeystrokeInputComponent` com escuta de teclado de alta precisão.

### Variáveis de execução

| Variável | Padrão | Descrição |
|---|---|---|
| `DEBUG_LOGS` | `false` no build de produção / `true` no Compose dev | Gera `/runtime-config.json` no entrypoint do Nginx e habilita logs JSON no console do navegador. |
| `FRONTEND_PORT` | `4200` | Porta publicada pelo Compose. |

O frontend propaga `X-Correlation-ID` nas chamadas `/api` e omite senhas, caracteres digitados, chaves nominais de features e tokens dos logs.
