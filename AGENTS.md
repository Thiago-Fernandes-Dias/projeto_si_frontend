# Diretrizes e Governança do Projeto para Agentes de IA (AGENTS.md)

Este documento estabelece as diretrizes operacionais, arquiteturais e de qualidade que o **Antigravity CLI** e quaisquer agentes de IA devem seguir rigorosamente ao atuar neste repositório.

---

## 1. Governança e Atualização Contínua de Requisitos

- **Fonte Única da Verdade:** O arquivo [requisitos.md](file:///Users/thiago/Repositories/projeto_si_frontend/requisitos.md) na raiz do repositório é a especificação oficial de requisitos do sistema.
- **Sincronização Obrigatória Pré-Implementação:** Sempre que o usuário solicitar uma alteração de comportamento, novo recurso, mudança de escopo ou ajuste de regra de negócio, o agente **deve atualizar primeiro o arquivo `requisitos.md`** refletindo as mudanças antes ou em conjunto com a escrita do código.
- **Rastreabilidade e Versionamento:** Nenhuma funcionalidade deve ser implementada em desacordo ou sem correspondência em `requisitos.md`. Cada alteração significativa deve ser registrada no histórico de versões do próprio documento de requisitos.

---

## 2. Boas Práticas de Arquitetura e Engenharia de Software (Stack Angular)

O frontend utiliza o ecossistema moderno do **Angular (v17+)** com **TypeScript estrito**. Todo código desenvolvido deve seguir as seguintes diretrizes:

### 2.1. Arquitetura de Componentes e Estrutura de Pastas
- **Standalone Components:** Uso exclusivo de componentes autônomos (`standalone: true`). É terminantemente proibido o uso de `NgModule` ou padrões obsoletos de versões antigas do Angular.
- **Separação Rígida de Camadas:**
  - `src/app/core/`: Serviços singleton globais (ex.: autenticação, gravação de eventos de digitação, interceptors HTTP) e modelos tipados.
  - `src/app/features/`: Componentes específicos de cada página/fluxo do usuário (`register`, `enrollment`, `login`, `dashboard`).
  - `src/app/shared/`: Componentes visuais reutilizáveis, diretivas de input e pipes puros.
- **Princípio da Responsabilidade Única (SRP):** Componentes devem conter exclusivamente lógica de apresentação e vinculação com templates. Toda lógica de cálculo biométrico, chamadas HTTP e manipulação complexa de estado deve residir em Serviços dedicados.

### 2.2. Reatividade e Gerenciamento de Estado
- **Angular Signals:** Priorizar o uso de Signals (`signal()`, `computed()`, `effect()`) para reatividade e gerenciamento de estado local/compartilhado em detrimento de subscriptions manuais.
- **Fluxos Assíncronos e RxJS:** Utilizar RxJS preferencialmente para operações assíncronas de I/O e comunicação HTTP (`HttpClient`), aplicando operadores limpos (`takeUntilDestroyed()`, `map`, `catchError`).
- **Injeção de Dependências:** Adotar a função `inject()` em vez de injeção por parâmetros de construtor verbosos.

### 2.3. Tipagem Estrita e Qualidade de Código (Clean Code)
- **Zero `any`:** Todos os tipos, eventos do DOM, payloads HTTP e vetores de características biométricas devem possuir interfaces ou tipos TypeScript estritos e autodocumentados.
- **Nomenclatura Semântica:** Variáveis, funções e classes devem utilizar termos completos, claros e concisos, expressando explicitamente seu papel no domínio do sistema (ex.: `KeystrokeCaptureService`, `computeFeatureVector`, `repetitionCount`).
- **Comentários Somente Quando Necessários:** Evitar comentários óbvios que apenas parafraseiam o código. Comentar exclusivamente desvios de padrão justificáveis, detalhes de timing físico ou algoritmos não triviais.
- **Precisão de Temporização Biométrica:** Todo cálculo de latência e duração de tecla deve empregar a API `performance.now()`. É proibido o uso de `Date.now()` para medição da dinâmica de digitação.

---

## 3. Testes Automatizados Obrigatórios (Cultura de Testes & Regressão)

- **Cobertura Mandatória para Toda Unidade de Código:** Para cada classe, serviço, componente, diretiva ou função utilitária criada ou modificada, deve existir um arquivo correspondente de teste automatizado (`*.spec.ts`).
- **Escopo e Cenários de Teste:**
  - **Serviços de Captura e Biometria (`keystroke-capture.service.spec.ts`):**
    - Simulação de eventos de teclado com alta precisão temporal.
    - Validação matemática correta das features: Hold Time ($H$), Down-Down ($DD$) e Up-Down ($UD$).
    - Tratamento de casos de borda: rejeição de *Backspace*, *Delete*, *Paste*, tecla liberada fora de ordem e timeouts.
  - **Serviços de API (`biometric-api.service.spec.ts`):**
    - Mocks de requisições HTTP (`HttpTestingController`), testes de sucesso e tratamento de falhas de rede / respostas de erro da API.
  - **Componentes Visuais (`register`, `enrollment`, `login`, `dashboard`):**
    - Validação dos formulários reativos.
    - Contagem e avanço correto das 5 repetições obrigatórias na tela de coleta.
    - Renderização dos feedbacks de acesso permitido, acesso bloqueado e credenciais inválidas.
- **Execução e Validação Pós-Mudança:**
  - Após qualquer modificação no código ou refatoração, o agente deve executar a suíte de testes automatizados (`npm test -- --watch=false` ou similar).
  - Nenhuma entrega é considerada concluída se houver qualquer teste quebrando ou com regressão.
