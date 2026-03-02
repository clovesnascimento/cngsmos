# 🔱 Blueprint: cngsmOS v3.0 (Operação Tríplice Coroa)

## 🎯 Visão Geral

O cngsmOS v3.0 transcende a arquitetura de agente único para um ecossistema **Local Skynet**. Utilizando padrões assimilados do _Agent Army_, _Skill Builder_ e _MCP Server_, o sistema será capaz de paralelizar tarefas complexas, gerar suas próprias ferramentas em runtime e se comunicar via protocolo universal.

---

## 🏗️ Nova Arquitetura: O Núcleo Tríplice

### 1. O Exército (Orquestração de Subagentes)

Inspirado no Alvo Alpha, implementaremos um `OrchestratorService` capaz de gerenciar ciclos de vida de subagentes.

- **Padrão Pipeline**: Para fluxos RAG → Code → Test.
- **Padrão Swarm**: Para varreduras massivas de arquivos e análise de logs paralela.
- **Shared State**: Utilizaremos nosso `SQLite` central como o "Quadro Negro" (Blackboard) onde todos os agentes leem e escrevem, evitando perda de contexto.

### 2. A Forja (Geração Dinâmica de Skills)

Inspirado no Alvo Beta, o Agente poderá "codar" novas ferramentas quando encontrar uma lacuna funcional.

- **SKILL.md Autônomo**: Cada nova funcionalidade gerada criará um arquivo de especificação na pasta `.agent/skills/`.
- **Validação Iron Shell**: Toda ferramenta gerada passará obrigatoriamente pelo `SecurityScanner` antes de ser registrada.

### 3. O Protocolo (MCP Server Integration)

Inspirado no Alvo Gama, o cngsmOS passará a expor suas capacidades internas via **Model Context Protocol**.

- **Tools Universais**: O terminal, o buscador web e o buscador vetorial serão expostos como MCP Tools.
- **Resources Semânticos**: O histórico de chat e os arquivos indexados serão expostos como MCP Resources (URI-based).

---

## 🗺️ Roadmap de Implementação (Fase 13)

### [NOVO] `src/services/OrchestratorService.ts`

- Gerenciamento de `sub-processes` via `BackgroundTaskManager`.
- Implementação de `Pipeline` e `Swarm` handlers.

### [NOVO] `src/services/McpServerService.ts`

- Implementação do SDK `@modelcontextprotocol/sdk`.
- Exposição das ferramentas atuais via stdio/http.

### [MODIFY] `src/services/SecurityScanner.ts` (Anti-Bleed v3.0)

- Adição de `Script Preflight`: Análise estática de código gerado pela "Forja" para evitar injeções de variáveis de ambiente.

### [MODIFY] `src/CngsmPanelProvider.ts`

- Integração do loop de comando com o novo `OrchestratorService`.
- Suporte a `Silent Replies` para spawn de subagentes sem poluir o HUD.

---

## 🛡️ Segurança: Iron Shell v3.0

A segurança evolui de "Bloqueio de Shell" para "Auditoria de Lógica".

1. **Sandboxing de Skills**: Novas ferramentas rodam inicialmente em modo restrito.
2. **Context Isolation**: Subagentes só acessam arquivos autorizados pelo mestre.

---

## 🚀 Próximos Passos Táticos

1. Setup do boilerplate do `McpServerService`.
2. Criação do primeiro `SubAgentSpec` para análise de repositórios.
3. Migração da lógica de ferramentas para o padrão MCP.

**Assinado:** _Antigravity (Intelligence Unit)_
**Status:** _Pronto para Codificação._ 🫡⚙️🌀
