# cngsmOS — Autonomous Coding Agent for VS Code

> **Factory-clean. Zero hardcoded secrets. Plug your LLM, start coding.**

cngsmOS is a VS Code extension that provides an autonomous AI coding agent capable of reading files, running terminal commands, searching the web, and operating via natural language — all inside your editor.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **Autonomous Agent Loop** | LLM-driven task execution using XML tool calls |
| 🔒 **Iron Shell Security** | Command validator, env-var hijacking prevention, shell-bleed detection |
| 💾 **RAG/Vector Search** | SQLite-backed semantic memory (VectorSearchService) |
| 🌐 **Web Search** | Tavily-powered real-time web search tool |
| 🔭 **Web Browser Control** | Chrome DevTools Protocol integration for page ingestion |
| 📄 **PDF Ingestion** | Read and ingest PDF documents into context |
| 🤝 **MCP Support** | Multi-agent coordination via Model Context Protocol |
| 📡 **Telegram Notifications** | Optional bot notifications for long-running tasks |
| 🧪 **Skill Forge** | Generate, audit, and run custom agent skills |
| 🎯 **QA Sentinel** | Quality assurance loop for generated code |

---

## 🚀 Quick Start

### 1. Install the Extension

Install `cngsmOS.vsix` directly in VS Code / VSCodium:

```
Extensions → ⋯ → Install from VSIX → select cngsmOS.vsix
```

Or via CLI:
```bash
code --install-extension cngsmOS.vsix
```

### 2. Configure Your LLM Provider

Open **Settings** (`Ctrl+,`) → search `cngsm`:

| Setting | Default | Description |
|---|---|---|
| `cngsm.baseUrl` | `http://localhost:11434/v1` | Any OpenAI-compatible API |
| `cngsm.model` | `deepseek-r1` | Model ID |
| `cngsm.apiKey` | *(empty)* | Your API key (stored securely) |

**Works with:** Ollama (local), OpenAI, Groq, DeepSeek, OpenRouter, xAI, or any OpenAI-compatible endpoint.

### 3. Open the Agent Panel

Click the **CNGSM Agent** icon in the Activity Bar, type your task, and press Enter.

---

## 🔐 Security Model

cngsmOS uses a defense-in-depth approach:

- **API keys** → stored via VS Code `SecretStorage` API, never on disk
- **Commands** → vetted by `Iron Shell` before execution (blocks `rm -rf /`, `LD_PRELOAD` injection, shell chaining, etc.)
- **Navigation** → domain denylist + allowlist (`allowlist.txt`) + user approval gate
- **Generated code** → audited by `SecurityScanner.auditForgedSkill()` before runtime
- **Zero hardcoded secrets** → all defaults are empty strings

---

## 🛠️ Build from Source

```bash
git clone https://github.com/clovesnascimento/cngsmos.git
cd cngsmos
npm install

# Development (with source maps)
npm run compile

# Watch mode
npm run watch

# Package VSIX
npm run package
npx @vscode/vsce package --out cngsmOS.vsix --allow-missing-repository --allow-star-activation
```

**Requirements:** Node.js 20+, npm, VS Code 1.109+

---

## 📂 Project Structure

```
src/
├── extension.ts                  # Extension entry point
├── CngsmPanelProvider.ts         # Webview panel & agent orchestration
├── services/
│   ├── LlmClient.ts              # OpenAI-compatible streaming client
│   ├── SecurityScanner.ts        # Iron Shell security layer
│   ├── OrchestratorService.ts    # Multi-agent task orchestration
│   ├── McpServerService.ts       # MCP protocol integration
│   ├── VectorSearchService.ts    # SQLite RAG / semantic search
│   ├── TelegramService.ts        # Telegram bot notifications
│   ├── SkillForgeService.ts      # Dynamic skill generation
│   ├── QaSentinelService.ts      # Quality assurance loop
│   ├── WebSemanticsService.ts    # Web page ingestion & summarization
│   └── BackgroundTaskManager.ts  # Async task management
└── tools/
    ├── FileSystem.ts             # File read/write tools
    ├── Terminal.ts               # Secure command execution
    └── WebSearch.ts              # Tavily web search integration
```

---

## ⚙️ Optional Integrations

<details>
<summary><b>Tavily Web Search</b></summary>

Get a free API key at [tavily.com](https://tavily.com) and set `cngsm.tavilyApiKey` in settings.
</details>

<details>
<summary><b>Telegram Notifications</b></summary>

Create a bot via [@BotFather](https://t.me/BotFather), then set `cngsm.telegramToken` and `cngsm.telegramChatId` in the extension settings panel.
</details>

<details>
<summary><b>Local LLM via Ollama</b></summary>

```bash
ollama run deepseek-r1
# Set cngsm.baseUrl = http://localhost:11434/v1
# Set cngsm.model   = deepseek-r1
# Leave cngsm.apiKey empty
```
</details>

---

## 📄 License

ISC © CNGSM
