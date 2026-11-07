# Frontend de Autenticação por Dinâmica de Digitação (*Keystroke Dynamics*)

Aplicação web desenvolvida em **Angular (v18 Standalone + Signals)** para cadastro de usuários, coleta guiada de amostras de digitação (5 repetições obrigatórias) e autenticação biométrica comportamental via dinâmica de digitação. O fluxo de usuário é guiado e focado (Cadastro ➔ Coleta de 5 Amostras ➔ Login).

O repositório inclui uma **Mock API dedicada em Python (Flask)** para simulação das respostas biométricas de Machine Learning sem necessidade de backend complexo ativo.

**Contexto Acadêmico:** UFABC — Sistemas Inteligentes (ESZI014-17)

---

## 1. Pré-Requisitos e Dependências

Você pode executar o projeto de duas formas: **localmente no sistema operacional** ou **em container via Docker**.

### Cenário A: Execução Sem Docker (Host Local)

Para rodar a aplicação e a Mock API diretamente na sua máquina, certifique-se de ter instalado:

1. **Node.js:** Versão `18.x`, `20.x` ou `22.x` (verifique com `node -v`).
2. **npm:** Versão `9.x` ou superior (verifique com `npm -v`).
3. **Python:** Versão `3.10+` e `pip` (para a Mock API em Flask).
4. **Google Chrome / Chromium:** Necessário para rodar a suíte de testes automatizados com o launcher headless (`ChromeHeadless`).
5. **Make:** Utilitário para execução simplificada dos comandos (disponível por padrão em Linux/macOS ou via WSL/Chocolatey no Windows).

### Cenário B: Execução Com Docker

Neste modo, não é necessário instalar Node.js ou npm no seu sistema operacional, pois todo o build e o ambiente de execução ficam encapsulados no container.

1. **Docker Engine / Docker Desktop:** Versão `20.10+` (verifique com `docker -v`).
2. **Make:** Opcional, para executar os atalhos de containerização.

---

## 2. Como Executar Sem Docker

### Passo 1: Instalar Dependências
Execute no terminal da raiz do projeto:
```bash
npm install
# ou usando o Makefile:
make install
```

### Passo 2: Iniciar a Mock API (Terminal 1)
```bash
make mock-install
make mock-dev
```
A Mock API iniciará em: **`http://localhost:5000`**.

### Passo 3: Iniciar o Frontend Angular (Terminal 2)
```bash
npm start
# ou usando o Makefile:
make dev
```
Acesse a aplicação no navegador em: **`http://localhost:4200`**.  
O frontend está configurado via [`proxy.conf.json`](proxy.conf.json) para repassar todas as chamadas `/api/*` diretamente para a Mock API em `http://127.0.0.1:5000`.

### Passo 4: Executar a Suíte de Testes Automatizados
```bash
# Testes unitários do Frontend (34 testes Jasmine/Karma)
make test

# Testes unitários da Mock API (6 testes Python unittest)
make mock-test
```

### Passo 5: Gerar Build de Produção
```bash
NG_CLI_ANALYTICS=false npm run build -- --configuration production
# ou usando o Makefile:
make build
```
Os arquivos otimizados serão gerados no diretório `dist/keystroke-auth-frontend/browser`.

---

## 3. Mock API em Python (Flask)

A Mock API localiza-se na pasta dedicada [`mock_api/`](mock_api/) e foi projetada para emular as decisões do modelo de biometria comportamental baseado nas características temporais ($H$, $DD$, $UD$).

### Endpoints Disponíveis:

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/health` | Verificação de integridade e status da API |
| `GET` | `/api/algorithms` | Lista os modelos de Machine Learning (RF, k-NN, MLP) |
| `POST` | `/api/register` | Recebe usuário e senha cadastrados |
| `POST` | `/api/enrollment` | Recebe o lote com as 5 amostras e calcula a média de Hold Time |
| `POST` | `/api/authenticate` | Valida credencial e compara o ritmo de digitação ($H$), retornando `GENUINE` ou `IMPOSTOR` |

### Lógica de Decisão Biometria na Mock API:
- **Genuíno:** Se o Hold Time médio da digitação estiver próximo à média calibrada nas 5 repetições do usuário (diferença $\le 75\text{ ms}$) e dentro dos limites fisiológicos humanos (entre $45\text{ ms}$ e $280\text{ ms}$).
- **Impostor:** Se a senha textual estiver correta, porém a cadência de digitação divergir significativamente da média histórica do usuário.
- **Credenciais Inválidas:** Se a senha textual digitada estiver incorreta.

---

## 4. Como Executar Com Docker

A aplicação conta com um [Dockerfile](Dockerfile) multi-stage otimizado (etapa de compilação em `node:22-alpine` e runtime leve em `nginx:alpine` com suporte a SPA e proxy reverso `/api/` via [nginx.conf](nginx.conf)).

### Modo Produção (Imagem Nginx Otimizada)

1. **Construir a Imagem Docker:**
   ```bash
   docker build -t keystroke-auth-frontend .
   # ou usando o Makefile:
   make docker-build
   ```

2. **Executar o Container:**
   ```bash
   docker run --rm -p 4200:80 --name keystroke-auth-instance keystroke-auth-frontend
   # ou usando o Makefile:
   make docker-run
   ```
   Acesse a aplicação em: **`http://localhost:4200`**.

3. **Parar o Container:**
   ```bash
   docker stop keystroke-auth-instance
   ```

### Modo Desenvolvimento em Container

Para desenvolver dentro de um container Docker montando o código local com sincronização automática:
```bash
make docker-dev
```

---

## 5. Resumo de Comandos do Makefile

O projeto inclui um [Makefile](Makefile) que padroniza os comandos mais frequentes:

| Comando | Descrição |
|---|---|
| `make help` | Exibe o menu com todos os comandos disponíveis |
| `make install` | Instala dependências do frontend via npm |
| `make dev` | Inicia o servidor Angular local com proxy em `http://localhost:4200` |
| `make test` | Executa a suíte de 34 testes unitários do frontend em modo headless |
| `make build` | Compila o bundle otimizado de produção em `dist/` |
| `make mock-install` | Instala dependências Python da Mock API (`flask`, `flask-cors`) |
| `make mock-dev` | Inicia a Mock API Python na porta `5000` |
| `make mock-test` | Executa os testes automatizados da Mock API em Python |
| `make docker-build` | Cria a imagem Docker de produção (`keystroke-auth-frontend`) |
| `make docker-run` | Sobe o container Docker servindo a aplicação na porta `4200` |
| `make docker-dev` | Inicia container Node interativo para desenvolvimento |
| `make clean` | Remove as pastas `dist/` e cache `.angular/` |

---

## 6. Estrutura do Projeto e Documentação

- [requisitos.md](requisitos.md): Especificação oficial de requisitos, colunas do benchmark CMU (`DSL-StrongPasswordData.csv`), formato dos payloads JSON e regras biométricas ($H$, $DD$, $UD$).
- [AGENTS.md](AGENTS.md): Diretrizes de engenharia de software e governança para agentes de IA atuando no repositório.
- [`mock_api/`](mock_api/): Mock API em Python/Flask com emulação de inferência biométrica.
- [`proxy.conf.json`](proxy.conf.json): Configuração de proxy reverso do Angular CLI para direcionar `/api/*` à Mock API.
- `src/app/core/`: Serviços de captura temporal (`KeystrokeCaptureService`), API REST (`BiometricApiService`) e modelos de dados.
- `src/app/features/`: Componentes das telas de cadastro (`register`), coleta de 5 amostras (`enrollment`) e login biométrico (`login`).
- `src/app/shared/`: Componente de campo de entrada protegido (`KeystrokeInputComponent`).
