# Frontend de Autenticação por Dinâmica de Digitação (*Keystroke Dynamics*)

Aplicação web desenvolvida em **Angular (v18 Standalone + Signals)** para cadastro de usuários, coleta guiada de amostras de digitação (5 repetições obrigatórias) e autenticação biométrica comportamental via dinâmica de digitação. O fluxo de usuário é guiado e focado (Cadastro ➔ Coleta de 5 Amostras ➔ Login).

**Contexto Acadêmico:** UFABC — Sistemas Inteligentes (ESZI014-17)

---

## 1. Pré-Requisitos e Dependências

Você pode executar o projeto de duas formas: **localmente no sistema operacional** ou **em container via Docker**.

### Cenário A: Execução Sem Docker (Host Local)

Para rodar a aplicação diretamente na sua máquina, certifique-se de ter instalado:

1. **Node.js:** Versão `18.x`, `20.x` ou `22.x` (verifique com `node -v`).
2. **npm:** Versão `9.x` ou superior (verifique com `npm -v`).
3. **Google Chrome / Chromium:** Necessário para rodar a suíte de testes automatizados com o launcher headless (`ChromeHeadless`).
4. **Make:** Utilitário para execução simplificada dos comandos (disponível por padrão em Linux/macOS ou via WSL/Chocolatey no Windows).

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

### Passo 2: Iniciar o Servidor de Desenvolvimento
```bash
npm start
# ou usando o Makefile:
make dev
```
Acesse a aplicação no navegador em: **`http://localhost:4200`**.  
O servidor possui *live-reload* e atualiza a interface a cada modificação nos arquivos-fonte.

### Passo 3: Executar a Suíte de Testes Automatizados
```bash
NG_CLI_ANALYTICS=false npm test -- --watch=false --browsers=ChromeHeadless
# ou usando o Makefile:
make test
```

### Passo 4: Gerar Build de Produção
```bash
NG_CLI_ANALYTICS=false npm run build -- --configuration production
# ou usando o Makefile:
make build
```
Os arquivos otimizados serão gerados no diretório `dist/keystroke-auth-frontend/browser`.

---

## 3. Como Executar Com Docker

A aplicação conta com um [Dockerfile](Dockerfile) multi-stage otimizado (etapa de compilação em `node:22-alpine` e runtime leve em `nginx:alpine` com suporte a SPA via [nginx.conf](nginx.conf)).

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
   Basta pressionar `Ctrl + C` no terminal onde o container está rodando, ou em outro terminal:
   ```bash
   docker stop keystroke-auth-instance
   ```

### Modo Desenvolvimento em Container (Sem instalar Node na máquina)

Para desenvolver dentro de um container Docker montando o código local com sincronização automática:
```bash
make docker-dev
```
O container executará em `http://localhost:4200` com os arquivos do repositório mapeados como volume.

---

## 4. Resumo de Comandos do Makefile

O projeto inclui um [Makefile](Makefile) que padroniza os comandos mais frequentes:

| Comando | Descrição |
|---|---|
| `make help` | Exibe o menu com todos os comandos disponíveis |
| `make install` | Instala dependências do projeto via npm |
| `make dev` | Inicia o servidor Angular local em `http://localhost:4200` |
| `make test` | Executa a suíte de 34 testes automatizados em modo headless |
| `make build` | Compila o bundle otimizado de produção em `dist/` |
| `make docker-build` | Cria a imagem Docker de produção (`keystroke-auth-frontend`) |
| `make docker-run` | Sobe o container Docker servindo a aplicação na porta `4200` |
| `make docker-dev` | Inicia container Node interativo para desenvolvimento |
| `make clean` | Remove as pastas `dist/` e cache `.angular/` |

---

## 5. Estrutura do Projeto e Documentação

- [requisitos.md](requisitos.md): Especificação oficial de requisitos, colunas do benchmark CMU (`DSL-StrongPasswordData.csv`), formato dos payloads JSON e regras biométricas ($H$, $DD$, $UD$).
- [AGENTS.md](AGENTS.md): Diretrizes de engenharia de software e governança para agentes de IA atuando no repositório.
- `src/app/core/`: Serviços de captura temporal (`KeystrokeCaptureService`), API REST (`BiometricApiService`) e modelos de dados.
- `src/app/features/`: Componentes das telas de cadastro (`register`), coleta de 5 amostras (`enrollment`) e login biométrico (`login`).
- `src/app/shared/`: Componente de campo de entrada protegido (`KeystrokeInputComponent`).
