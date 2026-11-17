# Especificação de Requisitos do Sistema (Frontend Angular)
## Projeto: Autenticação por Dinâmica de Digitação (*Keystroke Dynamics*)
**Contexto Acadêmico:** UFABC — Sistemas Inteligentes (ESZI014-17)

---

## 1. Visão Geral

Este documento detalha os requisitos funcionais, não-funcionais, arquiteturais e a especificação de dados para o frontend desenvolvido em **Angular 18**. O sistema implementa uma interface web para cadastro de usuários, coleta guiada de amostras de digitação (5 repetições da senha), troca de senha e autenticação biométrica comportamental. O frontend **não treina nem classifica** modelos: ele captura os eventos de teclado, calcula as features `H`, `DD` e `UD` e delega a decisão ao Backend .NET, que por sua vez chama a ML API (`M2005_IDB`).

### 1.1. Algoritmo Biométrico Utilizado

A classificação ocorre na `projeto_si_ml_api` com o **`M2005_IDB`** (*Improved Double Parallel*, Pisani et al., IJCNN 2015): submodelo deslizante de 50 amostras genuínas, submodelo crescente incremental com estatísticas de Welford (`O(1)`) e escore final pela média dos dois, comparado a um limiar calibrado por usuário (`min`/`min_non_outlier`, sem teto fixo). O treinamento é one-class (somente amostras genuínas). O `M2005_IDB` foi selecionado a partir de 52 experimentos nos benchmarks CMU e KeyRecs, com BACC médio `0.8445` (CMU: `BACC = 0.8909`, `FRR = 15.24%`, `FAR = 6.58%`).

---

## 2. Fluxo de Interação do Usuário

```
[Tela de Login] (página inicial) ── (Cadastrar) ──► [Tela de Cadastro]
                                  ── (Trocar senha) ──► [Tela de Troca de Senha]

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

0. **Página Inicial:** A aplicação abre na tela de login: a rota raiz (`/`) e qualquer rota inexistente redirecionam para `/login`. Novos usuários seguem para o cadastro pelo botão "Cadastrar" do painel do login (RF19).
1. **Cadastro:** O usuário preenche seus dados (nome/identificador e define sua senha).
2. **Coleta de Amostras (Enrollment):** Após a pré-checagem de disponibilidade do username, o usuário é automaticamente direcionado para a tela de coleta, onde deve digitar a senha cadastrada exatamente **5 vezes**.
3. **Envio e Calibração:** Ao atingir as 5 repetições válidas, o frontend envia username, senha e as amostras temporais em uma única requisição `POST /api/register`, que cria o usuário, persiste as amostras e delega o treinamento do classificador individual à ML API (`M2005_IDB`). Concluído o envio das 5 amostras, o campo de senha permanece bloqueado e a interface exibe um botão para que o usuário avance manualmente para a tela de login.
4. **Autenticação:** O usuário realiza login digitando sua credencial; o frontend extrai o vetor biométrico da tentativa e o envia ao backend, que valida a senha e as features e consulta o modelo na ML API para autorizar ou bloquear a sessão. O fluxo é linear e guiado, sem menu de navegação aberto.

---

## 3. Requisitos Funcionais (RF)

### 3.1. Cadastro de Usuário
- **RF01 - Formulário de Cadastro:** A interface deve fornecer campos para identificador de usuário (usuário/e-mail/RA), senha e confirmação de senha. A senha é digitada pelo próprio usuário, sem atalho para preencher a senha padrão do benchmark CMU. Os campos de senha e confirmação de senha devem permitir ocultar o texto digitado por padrão (máscara de senha), oferecendo botões de alternância com ícones exclusivos de olho (`bx-show` e `bx-hide`) para exibir ou ocultar o texto escrito, sem uso de ícones de cadeado.
  - **Regras de validação (compatíveis com o backend `projeto-si-backend`):** o identificador, após remover espaços nas pontas e converter para minúsculas, deve ter de 3 a 50 caracteres usando apenas letras sem acento, números e `. _ @ + -` (mesma regex do backend). O backend valida a senha apenas pelo tamanho (8 a 64 caracteres); o frontend acrescenta a restrição de não usar letras acentuadas nem os acentos `´ ` ~ ^ ¨`, que dependem de teclas mortas e impedem a captura correta de `KEY_DOWN`/`KEY_UP` (o `ç`/`Ç` é permitido). As regras são exibidas como dica abaixo do formulário e verificadas antes do envio ao backend.
- **RF02 - Redirecionamento Automático:** Concluída a validação textual do cadastro com sucesso, o frontend consulta `GET /api/username-availability?username=...`; somente se o username estiver disponível o usuário é direcionado para a tela de coleta de amostras de digitação. Se estiver em uso, o formulário permanece na tela com mensagem de erro.

### 3.2. Coleta de Amostras de Digitação (*Enrollment*)
- **RF03 - Coleta de Exatamente 5 Amostras:** A tela de coleta deve exigir a digitação da senha escolhida por exatamente **5 vezes** válidas. Ao concluir a 5ª repetição, a coleta é encerrada imediatamente, bloqueando o campo de entrada para novas digitações e impedindo a solicitação de repetições adicionais (como uma 6ª amostra).
- **RF04 - Feedback e Progresso Visual:** O sistema deve informar o progresso em tempo real (ex.: *"Amostra 1 de 5"*, *"Amostra 2 de 5"*), limpando o campo de entrada automaticamente a cada repetição concluída com sucesso.
- **RF05 - Validação Textual e Descarte de Inconsistências:** A amostra só é contabilizada se o texto digitado corresponder exatamente à senha escolhida no cadastro. Se houver discrepância de caracteres, a amostra é descartada com aviso instrutivo ao usuário.
- **RF06 - Invalidação por Correção ou Colagem:** Caso o usuário pressione teclas de correção (*Backspace*, *Delete*) ou realize colagem (*Paste*), o campo é limpo e a repetição atual deve ser reiniciada, assegurando a pureza do fluxo temporal. O mesmo vale para teclas mortas de acentuação (evento com `key === 'Dead'`), com aviso de que acentos não são suportados.
- **RF07 - Submissão Única de Cadastro e Amostras:** Ao atingir a 5ª repetição válida, o frontend monta o pacote com username, senha e as 5 amostras temporais e dispara uma única requisição HTTP POST para `/api/register`, que cria o usuário, persiste as amostras e treina o modelo inicial. Concluída a submissão, a interface mantém o campo de senha bloqueado e exibe um botão para prosseguir ao login, ocorrendo a navegação para a tela de autenticação exclusivamente após o clique do usuário nesse botão (sem redirecionamento automático).
  - **Falha no envio do lote:** a mensagem retornada pela API é exibida e o tratamento depende do status HTTP:
    - `400` (amostras recusadas): as 5 amostras são descartadas e a coleta recomeça do zero, com o campo de senha liberado.
    - `409` (nome de usuário indisponível): a mensagem orienta a voltar ao cadastro e escolher outro nome; o botão de voltar permanece habilitado.
    - `401` (credencial recusada, ex.: senha atual incorreta na troca de senha ou conta bloqueada): a mensagem orienta a voltar e conferir os dados; o lote não é reenviado.
    - Falha de conexão (`0`) ou erro do servidor (`5xx`): as 5 amostras são mantidas e a interface exibe o botão "Tentar enviar novamente", que reenvia o mesmo lote.
- **RF18 - Acesso à Coleta Somente Após Cadastro ou Troca de Senha:** A rota `/enrollment` é protegida pelo guard `registeredUserGuard`; sem um cadastro ou troca de senha iniciados na sessão em memória (por exemplo, após recarregar a página), o acesso é redirecionado para `/register`. Não existe usuário ou senha padrão de demonstração.
- **RF17 - Voltar ao Cadastro:** A tela de coleta oferece um botão de voltar identificado apenas por um ícone de seta (com rótulo acessível "Voltar para o cadastro", ou "Voltar para a troca de senha" quando a coleta veio da troca de senha), que encerra a captura em andamento, apaga o texto digitado e retorna à tela de origem. O botão fica desabilitado durante o envio do lote e depois da conclusão da coleta.

### 3.3. Captura e Extração de Características
- **RF08 - Registro Temporal de Alta Precisão:** A captura dos eventos de teclado (`keydown` e `keyup`) deve ser realizada utilizando a API `performance.now()` armazenando registros em buffer cronológico (`eventKeyLog`) com eventos do tipo `RawEventType` (`KEY_DOWN` e `KEY_UP`). O caractere digitado é registrado exclusivamente no momento do `KEY_DOWN`.
- **RF09 - Determinação Dinâmica de Intervalos e Cálculo de Métricas:**
  - **Função de Determinação de Intervalos:** A partir de qualquer senha definida (tomando como referência o benchmark CMU para `.tie5Roanl`), o sistema determina dinamicamente o conjunto de colunas/intervalos a serem extraídos.
  - **Identificação Sequencial Anti-Colisão:** Para prevenir sobrescrita de atributos quando a senha contiver caracteres ou dígrafos repetidos, os nomes dos intervalos recebem uma sequência indexada iniciada em 0 (ex.: `H.t.0`, `H.t.1`, `DD.t.e.0`, `UD.t.e.0`).
  - **Métricas Temporais Extraídas:**
    - **Hold Time ($H$):** Duração da pressão da tecla ($T_{\text{keyup}} - T_{\text{keydown}}$) para cada tecla da senha (`H.<key>.<seq>`).
    - **Down-Down ($DD$):** Latência entre a pressão da tecla atual e a próxima tecla ($T_{\text{keydown}_{i+1}} - T_{\text{keydown}_i}$) para cada par consecutivo (`DD.<key1>.<key2>.<seq>`).
    - **Up-Down ($UD$):** Tempo de voo entre a liberação da tecla atual e a pressão da próxima tecla ($T_{\text{keydown}_{i+1}} - T_{\text{keyup}_i}$) para cada par consecutivo (`UD.<key1>.<key2>.<seq>`).
- **RF10 - Validação Estrita da Sequência de Digitação:** Validação da cronologia do `eventKeyLog` antes do cômputo da amostra, assegurando que:
  - Os eventos `KEY_DOWN` correspondam exatamente e em ordem crescente de timestamp a cada caractere da senha.
  - Cada `KEY_DOWN` possua seu `KEY_UP` correspondente.
  - Teclas não tenham sido liberadas fora da ordem de digitação nem mantidas pressionadas de forma anômala (impedindo que o usuário mantenha uma tecla pressionada e a libere apenas ao final da senha).
  - O `KEY_DOWN` e o `KEY_UP` de uma mesma tecla são associados pela tecla física (`code`), e não pelo caractere (`key`), para que soltar o `Shift` antes da letra maiúscula não invalide a amostra.
  - Um `KEY_UP` só é registrado se a tecla teve o `KEY_DOWN` registrado na captura atual (ex.: a liberação do *Backspace* que reiniciou o campo é ignorada).
  - Nenhum Hold Time ($H$) ou Down-Down ($DD$) pode ultrapassar 5 segundos, limite aceito pelo backend; caso contrário a amostra é recusada localmente com aviso de pausa longa.

### 3.4. Login e Autenticação Biométrica
- **RF10 - Tela de Autenticação:** Campo de identificação e campo de senha monitorado por serviço de dinâmica de digitação, sem necessidade de configuração ou escolha manual de modelo por parte do usuário final.
- **RF11 - Consulta de Inferência Automática:** Envio assíncrono do vetor de características da digitação para o Backend .NET, que valida a senha e as features e consulta a ML API (`M2005_IDB`) utilizando o modelo calibrado do usuário.
- **RF12 - Decisão de Acesso:** Apresentação clara do resultado retornado pela inteligência artificial:
  - **Acesso Permitido (`GENUINE`):** Identidade biométrica compatível (Usuário Genuíno); o backend emite o JWT.
  - **Acesso Bloqueado (`IMPOSTOR`):** Senha textual correta, mas padrão de ritmo classificado como Impostor.
  - **Credenciais Inválidas (`INVALID_CREDENTIALS`):** Senha textual incorreta, conta bloqueada ou biometria ainda não concluída; a mensagem da API é exibida sem abrir sessão.

- **RF19 - Acessos Separados a Cadastro e Troca de Senha:** O painel da tela de login oferece duas ações distintas: "Cadastrar", que leva a `/register` e serve apenas para novos usuários, e "Trocar senha", que leva a `/change-password`. A troca de senha não passa pela tela de cadastro.

### 3.4.1. Troca de Senha
- **RF20 - Formulário de Troca de Senha:** A rota `/change-password` apresenta os campos usuário, senha atual, nova senha e confirmação da nova senha, todos os campos de senha com máscara e alternância de visibilidade por ícones de olho (`bx-show`/`bx-hide`), e um link para voltar ao login. Validações antes de prosseguir: usuário no mesmo padrão do cadastro (RF01), senha atual preenchida, nova senha seguindo as regras de senha do cadastro (8 a 64 caracteres, sem acentos), confirmação igual à nova senha e nova senha diferente da atual.
- **RF21 - Coleta da Nova Senha:** Validado o formulário, o usuário é levado à tela de coleta (`/enrollment`, RF03–RF07) para digitar a **nova** senha 5 vezes, pois o backend invalida a biometria e o modelo treinados antes da mudança de senha. Ao concluir as 5 repetições, o frontend envia `POST /api/change-password` (seção 5.4) em vez de `POST /api/register` e, em caso de sucesso, exibe "Senha alterada com sucesso!" com o botão para prosseguir ao login.

### 3.5. Sessão Autenticada
- **RF13 - Sessão e Rota Protegida:** Quando a decisão biométrica for `GENUINE`, o frontend registra a sessão do usuário (persistida em `localStorage`) e o direciona para a rota `/session`, protegida por guard (`authGuard`). O guard valida o JWT em `GET /api/session`; sem token, token expirado ou token emitido antes de uma troca de senha, a sessão local é encerrada e o usuário é redirecionado para `/login`.
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
- **RNF05 - Arquitetura Angular Moderna:** Uso obrigatório de Standalone Components, Angular Signals para estado reativo, tipagem estrita de modelos TypeScript, separação de responsabilidades em Services (conforme definido em [AGENTS.md](AGENTS.md)) e modularização estrutural de componentes de interface com arquivos desacoplados para template (`*.component.html`), folha de estilos (`*.component.scss`) e classe controladora (`*.component.ts`).
- **RNF06 - Containerização com Docker:** Disponibilização de `Dockerfile` para execução da aplicação em container isolado, suportando execução de desenvolvimento e build de produção com servidor Nginx.
- **RNF07 - Automação via Makefile:** Criação de `Makefile` com comandos padronizados para instalação de dependências (`make install`), build da aplicação (`make build`), execução de testes (`make test`), inicialização do servidor de desenvolvimento local (`make dev`), construção da imagem Docker (`make docker-build`) e execução do container (`make docker-run`).
- **RNF08 - Integração com Backend e Tratamento Estrito de Erros:** A comunicação do frontend é realizada diretamente com os endpoints da API backend (`/api/username-availability`, `/api/register`, `/api/change-password`, `/api/session`, `/api/authenticate`). É proibido o retorno de respostas prontas, mocks ou simulações locais em cenários de falha ou indisponibilidade da API. Todo erro de rede ou status de erro retornado pelo servidor deve ser devidamente capturado, tratado e apresentado de forma clara na interface do usuário.
- **RNF09 - Orquestração de Container da Aplicação:** Disponibilização de arquivo `docker-compose.yml` para execução da aplicação frontend em container isolado (Angular servido via Nginx) e configuração de proxy reverso do Nginx para encaminhar chamadas `/api/` ao serviço backend.
- **RNF10 - Identidade Visual:** As telas usam um cartão branco central (cantos de 30 px) dividido em duas metades: o formulário e um painel azul (`#7494ec`) com borda curva. Fonte Poppins (Google Fonts), ícones Boxicons 2.1.4 e fundo em gradiente (`#e2e2e2` → `#c9d6ff`). Cadastro, coleta, sessão autenticada e acesso bloqueado mostram o painel à direita; o login, à esquerda. Ao entrar no cadastro, no login, na sessão autenticada ou no acesso bloqueado, o painel desliza para o seu lado, como na troca entre cadastro e login do modelo visual de referência; a coleta, que vem logo após o cadastro, não repete o movimento. Abaixo de 650 px de largura, o painel fica no topo e o formulário embaixo. As classes visuais compartilhadas ficam em `src/styles.scss`. O campo de senha do login e da coleta continua sendo o `app-keystroke-input` (RF08). Login por outras plataformas (Google, Facebook, GitHub, LinkedIn), recuperação de senha e campo de e-mail do modelo de referência ficam fora do escopo. O fluxo linear da seção 2 é mantido: o painel do cadastro não oferece atalho para o login. Os painéis do cadastro e do login exibem o nome do sistema, "Keystroke Dynamics Biometrics", e a página não tem cabeçalho no topo nem rodapé: só o cartão aparece sobre o fundo. A tela de acesso bloqueado (RF15) usa o mesmo cartão com o painel e o botão em vermelho (`#e05a5a`).
- **RNF11 - Logs Estruturados e Diagnóstico de Fluxos em Tempo de Execução:** O frontend emite logs de depuração estruturados em JSON exclusivamente no console do navegador (`console.debug`) cobrindo os fluxos de cadastro, coleta/enrollment, captura biométrica, login e troca de senha, propagando `X-Correlation-ID` nas chamadas `/api/` via interceptor HTTP e omitindo senhas, caracteres digitados, chaves nominais de features e tokens JWT. O recurso permanece desativado em builds e containers de produção (`DEBUG_LOGS=false` por padrão), podendo ser habilitado dinamicamente no Docker Compose por meio da variável de ambiente `DEBUG_LOGS` que gera `/runtime-config.json` no entrypoint do Nginx.

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

Quando o usuário conclui as 5 repetições na tela de coleta, o frontend envia uma requisição `POST /api/register` com username, senha e as 5 amostras em uma única carga estruturada:

```json
{
  "username": "thiago_dias",
  "password": ".tie5Roanl",
  "samples": [
    {
      "repetition": 1,
      "features": {
        "H.period.0": 0.1491,
        "DD.period.t.0": 0.3979,
        "UD.period.t.0": 0.2488,
        "H.t.0": 0.1069,
        "DD.t.i.0": 0.1674,
        "UD.t.i.0": 0.0605,
        "H.i.0": 0.1169,
        "DD.i.e.0": 0.2212,
        "UD.i.e.0": 0.1043,
        "H.e.0": 0.1417,
        "DD.e.five.0": 1.1885,
        "UD.e.five.0": 1.0468,
        "H.five.0": 0.1146,
        "DD.five.Shift.r.0": 1.6055,
        "UD.five.Shift.r.0": 1.4909,
        "H.Shift.r.0": 0.1067,
        "DD.Shift.r.o.0": 0.7590,
        "UD.Shift.r.o.0": 0.6523,
        "H.o.0": 0.1016,
        "DD.o.a.0": 0.2136,
        "UD.o.a.0": 0.1120,
        "H.a.0": 0.1349,
        "DD.a.n.0": 0.1484,
        "UD.a.n.0": 0.0135,
        "H.n.0": 0.0932,
        "DD.n.l.0": 0.3515,
        "UD.n.l.0": 0.2583,
        "H.l.0": 0.1338
      },
      "rawTimings": [
        { "key": ".", "code": "Period", "timestamp": 1024.12, "eventType": "KEY_DOWN" },
        { "key": ".", "code": "Period", "timestamp": 1173.22, "eventType": "KEY_UP" },
        { "key": "t", "code": "KeyT", "timestamp": 1422.02, "eventType": "KEY_DOWN" },
        { "key": "t", "code": "KeyT", "timestamp": 1528.92, "eventType": "KEY_UP" }
      ],
      "textEntered": ".tie5Roanl",
      "totalDurationMs": 2310.45
    },
    {
      "repetition": 2,
      "features": { "...": "..." },
      "rawTimings": [],
      "textEntered": ".tie5Roanl",
      "totalDurationMs": 2288.17
    },
    {
      "repetition": 3,
      "features": { "...": "..." },
      "rawTimings": [],
      "textEntered": ".tie5Roanl",
      "totalDurationMs": 2301.92
    },
    {
      "repetition": 4,
      "features": { "...": "..." },
      "rawTimings": [],
      "textEntered": ".tie5Roanl",
      "totalDurationMs": 2295.4
    },
    {
      "repetition": 5,
      "features": { "...": "..." },
      "rawTimings": [],
      "textEntered": ".tie5Roanl",
      "totalDurationMs": 2318.06
    }
  ]
}
```

> As chaves de `features` incluem o sufixo sequencial gerado por `computeSample` (`H.t.0`, `H.t.1`, `DD.t.e.0`, ...). A senha de exemplo `.tie5Roanl` tem 10 teclas e gera 28 features; o benchmark CMU adiciona `Return` (31 features), mas a aplicação não inclui `Return` na senha.
>
> O backend usa `features`, `textEntered` e `totalDurationMs` para validar a amostra. `rawTimings` é aceito no contrato do frontend, mas ignorado e **nunca persistido**; a ML API recebe apenas os vetores posicionais `3n - 2` já mascarados pelo backend.

### 5.4. Contrato da Troca de Senha (`POST /api/change-password`)

> **Implementado no backend** pelo endpoint `POST /api/change-password` (`Features/Senha/AlterarSenha.cs`).

**Requisição** (mesmo formato de amostra do cadastro; `samples` contém 5 digitações da **nova** senha):

```json
{
  "username": "thiago_dias",
  "currentPassword": "senhaAtual123",
  "newPassword": "novaSenha456",
  "samples": [
    { "repetition": 1, "features": { "H.n.0": 0.1012, "DD.n.o.0": 0.2133, "UD.n.o.0": 0.1121, "...": "..." }, "rawTimings": [], "textEntered": "novaSenha456", "totalDurationMs": 1834.2 }
  ]
}
```

**Comportamento esperado do backend:**
1. Validar `newPassword` e `samples` com as mesmas regras de `POST /api/register` (8–64 caracteres, 5 amostras com `textEntered === newPassword` e features válidas) e exigir `newPassword !== currentPassword` → `400` com `{ "success": false, "message": "..." }`.
2. Verificar `currentPassword` contra o hash do usuário (contando tentativas falhas e respeitando o bloqueio, como no login). Usuário inexistente, senha incorreta ou conta bloqueada → `401` com `{ "success": false, "message": "..." }`, sem revelar se o usuário existe.
3. Chamar `Usuario.AlterarSenha(novoHash, agora)`, gravar as 5 amostras (`Origem = Cadastro`) e treinar o novo modelo na ML API (`POST /api/enrollment`); em sucesso, concluir o cadastro biométrico do usuário. O novo modelo passa a valer por ser posterior a `data_mudanca_senha`.
4. Responder `200` com `{ "success": true, "message": "...", "samplesRegistered": 5, "calculatedAverageHoldMs": 112.4 }`.
5. Se o treinamento na ML API falhar, remover as amostras novas, restaurar o hash e `data_mudanca_senha` anteriores, remover modelos criados após a troca (`POST /api/models/rollback`) e responder `502` com `{ "success": false, "message": "..." }`.
6. Tokens JWT emitidos antes da troca passam a ser recusados em `GET /api/session`, pois a claim `pwd` deixa de coincidir com `data_mudanca_senha`.

---

## 6. Arquitetura e Estrutura do Frontend Angular

```
src/app/
├── core/
│   ├── validation/
│   │   └── credential-rules.ts       # Regras de usuário e senha compartilhadas por cadastro e troca de senha
│   ├── guards/
│   │   ├── auth.guard.ts             # Bloqueia /session sem sessão ativa e redireciona para /login
│   │   ├── blocked-attempt.guard.ts  # Libera /blocked só depois de uma tentativa IMPOSTOR
│   │   └── registered-user.guard.ts  # Libera /enrollment só com usuário cadastrado na sessão
│   ├── config/
│   │   └── runtime-config.service.ts # Carrega /runtime-config.json no bootstrap para controle runtime de debug logs
│   ├── interceptors/
│   │   └── correlation.interceptor.ts # Injeta X-Correlation-ID e registra duração HTTP nas chamadas /api
│   ├── models/
│   │   ├── keystroke.model.ts        # Tipos para eventos, features H/DD/UD e amostras
│   │   └── user.model.ts             # Modelos de usuário e autenticação
│   └── services/
│       ├── debug-logger.service.ts      # Logger estruturado em JSON (console.debug) com redação de dados sensíveis
│       ├── keystroke-capture.service.ts # Captura keydown/keyup e calcula H, DD, UD
│       ├── biometric-api.service.ts     # Comunicação com /username-availability, /register, /change-password, /authenticate, /session e /health
│       ├── user-session.service.ts      # Usuário-alvo do cadastro/troca de senha e amostras da coleta em memória
│       └── auth.service.ts              # Sessão autenticada (localStorage), logout e última tentativa bloqueada
├── features/
│   ├── register/                     # Tela 1: Cadastro de usuário
│   │   └── register.component.ts
│   ├── enrollment/                   # Tela 2: Coleta obrigatória de 5 amostras
│   │   └── enrollment.component.ts
│   ├── login/                        # Tela 3: Login com autenticação biométrica
│   │   └── login.component.ts
│   ├── change-password/              # Troca de senha (rota /change-password), seguida da coleta da nova senha
│   ├── session/                      # Tela 4: Área de sessão autenticada (rota /session)
│   └── blocked/                      # Tela 5: Acesso bloqueado após decisão IMPOSTOR (rota /blocked)
└── shared/
    └── components/
        └── keystroke-input/          # Input reutilizável com escuta de performance.now()
src/app/app.routes.ts                 # Rotas /login, /register, /enrollment, /change-password, /session e /blocked
src/styles.scss                       # Classes visuais compartilhadas (cartão, painel, campos, botões) do RNF10
docker-compose.yml                    # Orquestração do container frontend
nginx.conf                            # SPA + proxy /api/ para backend:5000
```

---

## 7. Governança e Histórico de Revisões

Este documento segue as diretrizes estabelecidas no [AGENTS.md](AGENTS.md) e deve ser atualizado obrigatoriamente a cada nova solicitação de funcionalidade ou alteração de escopo.

| Versão | Data | Autor / Agente | Descrição das Modificações |
|---|---|---|---|
| `1.0.0` | 2026-11-07 | Thiago Dias / Antigravity | Versão inicial dos requisitos de Keystroke Dynamics e arquitetura Angular. |
| `1.1.0` | 2026-11-07 | Thiago Dias / Antigravity | Integração do fluxo de cadastro com coleta de 5 amostras obrigatórias, mapeamento do benchmark CMU (`DSL-StrongPasswordData.csv`), definição do payload JSON e governança via `AGENTS.md`. |
| `1.2.0` | 2026-11-07 | Thiago Dias / Antigravity | Inclusão dos requisitos de infraestrutura: Dockerfile (containerização) e Makefile para automação de build, testes e execução em modo de desenvolvimento. |
| `1.3.0` | 2026-11-07 | Thiago Dias / Antigravity | Simplificação de interface: remoção da Dashboard, remoção dos links da barra de navegação global (fluxo linear guiado Cadastro -> Coleta -> Login) e remoção da escolha manual de algoritmos na tela de login. |
| `1.4.0` | 2026-11-07 | Thiago Dias / Antigravity | Criação da Mock API em Python/Flask na pasta dedicada `mock_api/` e configuração de proxy no frontend Angular para resolução de chamadas `/api/*`. |
| `1.5.0` | 2026-11-07 | Thiago Dias / Antigravity | Remoção de qualquer menção ou endpoint de listagem de algoritmos na Mock API e no serviço do frontend. |
| `1.6.0` | 2026-11-07 | Thiago Dias / Antigravity | Correção do encerramento da coleta: remoção da solicitação da 6ª amostra e bloqueio imediato da entrada após a 5ª repetição válida. |
| `1.7.0` | 2026-11-07 | Thiago Dias / Antigravity | Remoção de menções explícitas à API técnica `performance.now()` nos textos visíveis ao usuário final na interface (UI). |
| `1.8.0` | 2026-11-07 | Thiago Dias / Antigravity | Remoção completa dos tipos e propriedades de algoritmos (`MachineLearningAlgorithm`, `selectedAlgorithm`, `algorithm`) dos modelos, serviços e componentes do frontend. |
| `1.9.0` | 2026-11-07 | Thiago Dias / Antigravity | Refatoração de captura: buffer `eventKeyLog` com `RawEventType` (`KEY_DOWN`/`KEY_UP`), registro de texto no `keydown`, determinação dinâmica de intervalos a partir da senha, sufixo sequencial anti-colisão (`H.t.0`, `H.t.1`) e validação estrita anti-retenção de teclas. |
| `1.10.0` | 2026-11-14 | Thiago Dias / Antigravity | Remoção da Mock API em Python/Flask e eliminação de respostas prontas/fallbacks em `BiometricApiService`, garantindo tratamento e exibição adequados de erros na UI. |
| `1.11.0` | 2026-11-15 | Thiago Dias / Antigravity | Inclusão de logs de depuração estruturados em JSON (`console.debug`) nos fluxos de cadastro, coleta/enrollment, captura e login com correlação `X-Correlation-ID`, mascaramento de segredos e toggle em runtime via `/runtime-config.json` / `DEBUG_LOGS` no Nginx. |
| `1.12.0` | 2026-11-15 | Thiago Dias / Antigravity | Unificação dos endpoints de cadastro e enrollment em `POST /api/register`, que passa a receber username, senha e as 5 amostras em uma única requisição; o frontend consome apenas esse endpoint. |
| `1.13.0` | 2026-11-15 | Julia Vital | Alinhamento com as regras do backend .NET: validação de usuário (3–50, `a-z0-9._@+-`) e senha (8–64, sem acentos) no cadastro; reenvio ou recoleta do lote conforme o status HTTP da falha em `/api/register` (409 = nome indisponível); guard `registeredUserGuard` e remoção do usuário padrão `s002_cmu`; pareamento de `KEY_DOWN`/`KEY_UP` por tecla física, descarte de `KEY_UP` órfão, bloqueio de teclas mortas e da tecla `AltGraph` e limite local de 5 s para $H$ e $DD$. |
| `1.14.0` | 2026-11-15 | Julia Vital | Troca de senha separada do cadastro: ações distintas no painel do login (RF19), tela `/change-password` (RF20) seguida da coleta da nova senha (RF21), contrato `POST /api/change-password` implementado no backend (seção 5.4), `401` sem reenvio na coleta e regras de credencial compartilhadas em `credential-rules.ts`. |
| `1.15.0` | 2026-11-15 | Julia Vital | Página inicial alterada para o login: a rota raiz (`/`) e rotas inexistentes redirecionam para `/login` em vez de `/register`. |
| `1.16.0` | 2026-11-15 | Thiago Dias / Antigravity | `authGuard` passa a validar o JWT em `GET /api/session`; tokens emitidos antes de uma troca de senha são recusados e a sessão local é encerrada. Removido o tratamento de endpoint de troca de senha ausente (`404`). |
| `1.17.0` | 2026-11-15 | Thiago Dias / Antigravity | Verificação de disponibilidade do username via `GET /api/username-availability` antes de avançar do cadastro para a coleta das amostras iniciais. |
| `1.18.0` | 2026-11-16 | Thiago Dias / Antigravity | Alinhamento da documentação de requisitos com o estado atual: remoção da referência à visualização de modelos RF/k-NN/MLP e à Mock API, registro do algoritmo `M2005_IDB`, decisão `INVALID_CREDENTIALS`, validação de JWT no `authGuard`, payload real de `KeystrokeSample` (incluindo `rawTimings` ignorado e `textEntered`) e comportamento `502`/rollback na troca de senha. |
| `1.19.0` | 2026-11-16 | Thiago Dias / OpenCode | Correção do payload de exemplo de `POST /api/register`: chaves de `features` com sufixo sequencial (`H.t.0`, `DD.t.e.0`, ...), remoção de `Return` do exemplo da aplicação (10 teclas → 28 features) e distinção entre as regras de senha do backend (8–64) e do frontend (sem acentos/teclas mortas, exceto `ç`/`Ç`). |
