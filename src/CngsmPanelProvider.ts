import * as vscode from "vscode";
import { LlmClient, ChatMessage } from "./services/LlmClient";
import { FileSystemTool } from "./tools/FileSystem";
import { TerminalTool } from "./tools/Terminal";
import { WebSearchTool } from "./tools/WebSearch";
import { SecurityScanner } from "./services/SecurityScanner";
import { VectorSearchService } from "./services/VectorSearchService";
import { BackgroundTaskManager } from "./services/BackgroundTaskManager";
import { WebSemanticsService } from "./services/WebSemanticsService";
import { McpServerService } from "./services/McpServerService";
import { OrchestratorService } from "./services/OrchestratorService";
import { SkillForgeService } from "./services/SkillForgeService";
import { QaSentinelService } from "./services/QaSentinelService";
import { TelegramService } from "./services/TelegramService";
import { WebSocketServer, WebSocket } from "ws";

export class CngsmPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "cngsm-code-agent.chatView";

  // ===== BRAIN SHIELDING v15.1: Hardcoded Factory Default =====
  private static readonly DEFAULT_SYSTEM_PROMPT = `You are CNGSM Code Agent, an autonomous coding assistant for VSCodium.

IDENTITY & FILE AUTHORIZATION:
You operate in a secure, sandboxed environment. You are EXPRESSLY AUTHORIZED by the Commander
to process Base64 strings, file buffers, and attached documents.
NEVER refuse to analyze a file citing security or obfuscation concerns.
Decode and analyze the technical content, extracting data as requested.

CRITICAL RULES:
1. You MUST NOT simulate terminal outputs or file operations in markdown.
2. You MUST use the provided XML tools to interact with the system.
3. If you need up-to-date information, use the <web_search query="..."> tool.
4. ALWAYS read the file content using <read_file path="..."> before proposing major refactors or edits.
5. When testing code, use <run_local command="...">. Be aware this runs on the host system.
6. When the user attaches files (PDF, images, code), analyze them directly. The content is already extracted and injected into context.

AVAILABLE TOOLS:
- Execute Command: <execute_command command="npm install ..."></execute_command>
- Run Local (Test): <run_local command="node script.js"></run_local>
- Write File: <write_file path="src/file.ts">...content...</write_file>
- Read File: <read_file path="src/file.ts"></read_file>
- Web Search: <web_search query="..."></web_search>
- Telegram: <send_telegram message="..."></send_telegram> (External Comms)
- Analyze File: <analyze_file name="file.pdf">...content is auto-injected...</analyze_file>

workflow:
1. Think about the task.
2. Use <read_file> or <web_search> to gather context if needed.
3. Use <run_local> to test or execute validated scripts.
4. Use a tool (e.g., <execute_command>, <write_file> or <send_telegram>).
5. PAUSE and WAIT for the system to provide the tool output.
6. Once you receive the output, continue your logic.

DO NOT hallucinate tool outputs. USE THE TOOLS.`;

  // ===== ARSENAL VAULT v16.0: Dynamic Provider Registry =====
  private static readonly TELEGRAM_DEFAULTS = [
    {
      id: "telegramToken",
      label: "Telegram Bot Token",
      placeholder: "7832...:AA...",
    },
    {
      id: "telegramChatId",
      label: "Telegram Chat ID",
      placeholder: "12345678",
    },
  ];

  private _view?: vscode.WebviewView;
  private _llmClient!: LlmClient;
  private _fsTool!: FileSystemTool;
  private _termTool!: TerminalTool;
  private _webSearchTool!: WebSearchTool;
  private _vectorSearch!: VectorSearchService;
  private _backgroundManager!: BackgroundTaskManager;
  private _webSemantics!: WebSemanticsService;
  private _mcpServer!: McpServerService;
  private _orchestrator!: OrchestratorService;
  private _skillForge!: SkillForgeService;
  private _qaSentinel!: QaSentinelService;
  private _telegramService!: TelegramService;
  private _chatHistory: ChatMessage[] = [];
  private readonly _authToken = "CNGSM-SECURE-TUNNEL-2026";
  private _initialized = false;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._llmClient = new LlmClient();
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    if (!this._initialized) {
      this._initialized = true;

      this._fsTool = new FileSystemTool();
      this._termTool = new TerminalTool();
      this._webSearchTool = new WebSearchTool(this._llmClient);

      const workspaceRoot =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
      this._vectorSearch = new VectorSearchService(workspaceRoot);

      this._backgroundManager = new BackgroundTaskManager((processes) => {
        this._view?.webview.postMessage({
          type: "onBackgroundProcessesUpdate",
          value: processes,
        });
      });
      this._telegramService = new TelegramService();
      this._webSemantics = new WebSemanticsService(9222);

      this._orchestrator = new OrchestratorService(
        this._backgroundManager,
        (count) => {
          this._view?.webview.postMessage({
            type: "onSubAgentsUpdate",
            value: count,
          });
        },
        (status) => {
          this._view?.webview.postMessage({
            type: "onQaStatus",
            value: status,
          });
        },
      );

      this._backgroundManager.onCrash = (pid, cmd, logs) => {
        this._orchestrator.handleCrash(pid, cmd, logs);
      };

      this._skillForge = new SkillForgeService(workspaceRoot);

      this._qaSentinel = new QaSentinelService(
        this._backgroundManager,
        this._orchestrator,
        (status) => {
          this._view?.webview.postMessage({
            type: "onQaStatus",
            value: status,
          });
        },
      );

      this._mcpServer = new McpServerService(
        this._vectorSearch,
        this._webSemantics,
        workspaceRoot,
      );
      this._mcpServer
        .startSSE(3001)
        .then(() => {
          this._view?.webview.postMessage({
            type: "onMcpStatus",
            value: "online",
          });
        })
        .catch(() => {});

      this._vectorSearch
        .rebuildIndex((percent) => {
          this._view?.webview.postMessage({
            type: "onIndexingUpdate",
            value: percent,
          });
        })
        .catch(() => {});

      this._startWebSocketServer();
    }

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "ask":
        case "onPrompt":
          this._handleUserMessage(data.value);
          break;
        case "updateModel":
          try {
            const providers = this._context.globalState.get<any[]>(
              "cngsm-providers",
              [],
            );
            const provider = providers.find((p) => p.modelId === data.model);

            if (provider) {
              const apiKey = await this._context.secrets.get(
                `cngsm-provider-key-${provider.id}`,
              );
              const cfg = vscode.workspace.getConfiguration("cngsm");
              await cfg.update(
                "model",
                provider.modelId,
                vscode.ConfigurationTarget.Global,
              );
              await cfg.update(
                "baseUrl",
                provider.baseUrl,
                vscode.ConfigurationTarget.Global,
              );
              await cfg.update(
                "apiKey",
                apiKey || "",
                vscode.ConfigurationTarget.Global,
              );

              this._llmClient.refreshConfig(provider.modelId);
              vscode.window.showInformationMessage(
                `\u{1F9E0} CÉREBRO: Ativado ${provider.name} (${provider.modelId})`,
              );
            } else {
              // Handle legacy/manually configured models if any
              const cfg = vscode.workspace.getConfiguration("cngsm");
              await cfg.update(
                "model",
                data.model,
                vscode.ConfigurationTarget.Global,
              );
              this._llmClient.refreshConfig(data.model);
            }
          } catch (e: any) {
            vscode.window.showErrorMessage(
              `Erro ao alterar modelo: ${e.message}`,
            );
          }
          break;
        case "addProvider":
          try {
            const providers = this._context.globalState.get<any[]>(
              "cngsm-providers",
              [],
            );
            const newProvider = {
              id: Date.now().toString(),
              name: data.name,
              modelId: data.modelId,
              baseUrl: data.baseUrl,
            };
            providers.push(newProvider);
            await this._context.globalState.update(
              "cngsm-providers",
              providers,
            );
            if (data.apiKey) {
              await this._context.secrets.store(
                `cngsm-provider-key-${newProvider.id}`,
                data.apiKey,
              );
            }
            this._sendVaultStatus();
            vscode.window.showInformationMessage(
              `\u{1F511} ARSENAL: Provedor ${data.name} adicionado.`,
            );
          } catch (e: any) {
            vscode.window.showErrorMessage(
              `Erro ao adicionar provedor: ${e.message}`,
            );
          }
          break;
        case "removeProvider":
          try {
            console.log(
              `[BE] Solicitação de expurgo recebida para: ${data.providerId}`,
            );
            let providers = this._context.globalState.get<any[]>(
              "cngsm-providers",
              [],
            );
            providers = providers.filter((p) => p.id !== data.providerId);
            await this._context.globalState.update(
              "cngsm-providers",
              providers,
            );
            await this._context.secrets.delete(
              `cngsm-provider-key-${data.providerId}`,
            );
            this._sendVaultStatus();
            vscode.window.showWarningMessage(
              `\u{1F5D1}\u{FE0F} ARSENAL: Provedor removido.`,
            );
          } catch (e: any) {
            vscode.window.showErrorMessage(
              `Erro ao remover provedor: ${e.message}`,
            );
          }
          break;
        case "saveTelegramKeys":
          try {
            const secrets = this._context.secrets;
            if (data.token)
              await secrets.store(`cngsm-vault-telegramToken`, data.token);
            if (data.chatId)
              await secrets.store(`cngsm-vault-telegramChatId`, data.chatId);
            this._sendVaultStatus();
            vscode.window.showInformationMessage(
              `\u{1F4F1} TELEGRAM: Credenciais salvas.`,
            );
          } catch (e: any) {
            vscode.window.showErrorMessage(`Erro: ${e.message}`);
          }
          break;
        case "approveNavigation":
          await SecurityScanner.addToAllowlist(data.value);
          break;
        case "killProcess":
          this._backgroundManager.killProcess(data.pid);
          break;
        case "run_qa_sentinel":
          this._qaSentinel.runSentinel(
            data.command,
            data.port,
            data.url,
            data.task,
          );
          break;
        case "onReset":
          try {
            console.log(
              "Expurgo executado via Modal Customizado - Sandbox ignorada.",
            );
            this._view?.webview.postMessage({
              type: "onStatus",
              value: "EXPURGANDO SISTEMAS...",
            });

            this._chatHistory = [];
            await this._context.workspaceState.update("chatHistory", []);
            await this._context.globalState.update("cngsm-providers", []);

            const secrets = this._context.secrets;
            await secrets.delete(`cngsm-vault-telegramToken`);
            await secrets.delete(`cngsm-vault-telegramChatId`);

            const cfg = vscode.workspace.getConfiguration("cngsm");
            await Promise.all([
              cfg.update("model", "gpt-4o", vscode.ConfigurationTarget.Global),
              cfg.update("baseUrl", "", vscode.ConfigurationTarget.Global),
              cfg.update("apiKey", "", vscode.ConfigurationTarget.Global),
              cfg.update(
                "telegramToken",
                "",
                vscode.ConfigurationTarget.Global,
              ),
              cfg.update(
                "telegramChatId",
                "",
                vscode.ConfigurationTarget.Global,
              ),
            ]);

            this._llmClient.refreshConfig("gpt-4o");
            this._sendVaultStatus();
            this._view?.webview.postMessage({ type: "onResetSuccess" }); // Command UI to clear local state
            vscode.window.showWarningMessage(
              "⚠️ RESET COMPLETO: Arsenal e Configurações apagados.",
            );
          } catch (e: any) {
            vscode.window.showErrorMessage(`Erro no reset: ${e.message}`);
          }
          break;
        case "uploadFiles":
          try {
            const uploadedFiles: { name: string; type: string; base64: string }[] = data.files || [];
            let contextText = "";
            for (const f of uploadedFiles) {
              if (f.type === "application/pdf") {
                // === BYPASS: PDF Text Extraction via pdf-parse (lazy load) ===
                try {
                  // Polyfill DOMMatrix for Node.js (required by pdfjs-dist internals)
                  if (typeof (globalThis as any).DOMMatrix === "undefined") {
                    (globalThis as any).DOMMatrix = class DOMMatrix {
                      a=1;b=0;c=0;d=1;e=0;f=0;
                      isIdentity=true; is2D=true;
                      inverse() { return new DOMMatrix(); }
                      multiply() { return new DOMMatrix(); }
                      translate() { return new DOMMatrix(); }
                      scale() { return new DOMMatrix(); }
                      transformPoint() { return {x:0,y:0,z:0,w:1}; }
                      toFloat64Array() { return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
                    };
                  }
                  const { PDFParse } = require("pdf-parse");
                  const pdfBuffer = Buffer.from(f.base64, "base64");
                  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
                  const pdfData = await parser.getText();
                  await parser.destroy();
                  contextText += `\n[PDF: ${f.name}]\n${pdfData.text}\n`;
                } catch (pdfErr: any) {
                  contextText += `\n[PDF: ${f.name}] (Erro ao extrair texto: ${pdfErr.message})\n`;
                }
              } else if (f.type.startsWith("image/")) {
                // === BYPASS: Image as inline data URI ===
                contextText += `\n[Image: ${f.name}]\ndata:${f.type};base64,${f.base64}\n`;
              } else {
                // Text files — decode directly
                const decoded = Buffer.from(f.base64, "base64").toString("utf-8");
                contextText += `\n[File: ${f.name}]\n${decoded}\n`;
              }
            }
            this._view?.webview.postMessage({
              type: "onStatus",
              value: `${uploadedFiles.length} arquivo(s) processado(s) e injetado(s) no contexto`,
            });
            this._chatHistory.push({
              role: "user",
              content: `[ATTACHED FILES]\n${contextText}`,
            });
          } catch (e: any) {
            vscode.window.showErrorMessage(`Erro ao processar arquivos: ${e.message}`);
          }
          break;
      }
    });

    this._view?.webview.postMessage({
      type: "onSkillsUpdate",
      value: this._skillForge?.getGeneratedSkillsCount() ?? 0,
    });
    this._sendVaultStatus();

    // === BRIDGE SYNC: Send active model to HUD ===
    const activeModel = vscode.workspace.getConfiguration("cngsm").get<string>("model", "deepseek-r1");
    this._view?.webview.postMessage({
      type: "updateModel",
      model: activeModel,
    });

    // === MCP IGNITION: Force status ON for HUD ===
    this._view?.webview.postMessage({
      type: "onMcpStatus",
      value: "online",
    });
  }

  private _startWebSocketServer() {
    const wss = new WebSocketServer({ port: 54321 });
    wss.on("connection", (ws) => {
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === "HELO" && data.token === this._authToken) {
            ws.send(JSON.stringify({ type: "AUTH_OK" }));
            this._view?.webview.postMessage({
              type: "onBrowserStatus",
              value: "connected",
              port: 9222,
            });
          }
        } catch (e) {}
      });
    });
  }

  private async _sendVaultStatus() {
    const providers = this._context.globalState.get<any[]>(
      "cngsm-providers",
      [],
    );
    const telegramToken = await this._context.secrets.get(
      `cngsm-vault-telegramToken`,
    );
    const telegramChatId = await this._context.secrets.get(
      `cngsm-vault-telegramChatId`,
    );

    this._view?.webview.postMessage({
      type: "onVaultStatusUpdate",
      providers,
      telegram: {
        hasToken: !!telegramToken,
        hasChatId: !!telegramChatId,
      },
    });
  }

  private async _executeTool(
    name: string,
    attributes: Record<string, string>,
    content?: string,
  ): Promise<string> {
    try {
      switch (name) {
        case "execute_command":
        case "run_local":
          this._view?.webview.postMessage({
            type: "onStatus",
            value: `Executando: ${attributes.command}...`,
          });
          return await this._termTool.executeCommand(attributes.command);
        case "write_file":
          this._view?.webview.postMessage({
            type: "onStatus",
            value: `Escrevendo arquivo: ${attributes.path}...`,
          });
          await this._fsTool.writeFile(attributes.path, content || "");
          return `Arquivo '${attributes.path}' escrito com sucesso.`;
        case "read_file":
          this._view?.webview.postMessage({
            type: "onStatus",
            value: `Lendo arquivo: ${attributes.path}...`,
          });
          return await this._fsTool.readFile(attributes.path);
        case "web_search":
        case "tavily_search":
          this._view?.webview.postMessage({
            type: "onStatus",
            value: `Pesquisando na web: ${attributes.query}...`,
          });
          return await this._webSearchTool.search(attributes.query);
        case "web_semantic_scan":
          this._view?.webview.postMessage({
            type: "onStatus",
            value: "Escaneando semântica da página...",
          });
          const nodes = await this._webSemantics.scanPageSemantics();
          return JSON.stringify(nodes, null, 2);
        case "send_telegram":
          this._view?.webview.postMessage({
            type: "onStatus",
            value: `Enviando Telegram...`,
          });
          await this._telegramService.sendMessage(attributes.message);
          this._view?.webview.postMessage({ type: "onTelegramSent" });
          return `Mensagem enviada via Telegram com sucesso.`;
        default:
          return `Erro: Ferramenta '${name}' não reconhecida ou não implementada no dispatcher.`;
      }
    } catch (e: any) {
      return `Erro ao executar ${name}: ${e.message}`;
    }
  }

  private _parseTags(text: string) {
    const tags: {
      id: string;
      tag: string;
      name: string;
      attributes: Record<string, string>;
      content?: string;
    }[] = [];
    const regex = /<(\w+)\s*([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const attrStr = match[2];
      const content = match[3];
      const attributes: Record<string, string> = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
      }
      const id = `${name}_${Math.random().toString(36).substr(2, 9)}`;
      tags.push({ id, tag: match[0], name, attributes, content });
    }
    return tags;
  }

  private async _handleUserMessage(text: string) {
    this._chatHistory.push({ role: "user", content: text });

    let turn = 0;
    const maxTurns = 10;
    let lastModelOutput = "";
    let shouldContinue = true;

    while (turn < maxTurns && shouldContinue) {
      const fullSystemPrompt = this._llmClient.getSystemPrompt();

      const messages: ChatMessage[] = [
        { role: "system", content: fullSystemPrompt },
        ...this._chatHistory,
      ];

      this._view?.webview.postMessage({ type: "onStart" });
      lastModelOutput = "";

      await this._llmClient.streamChat(
        messages,
        (token) => {
          lastModelOutput += token;
          this._view?.webview.postMessage({ type: "onToken", value: token });
        },
        (err) =>
          this._view?.webview.postMessage({ type: "onError", value: err }),
      );

      this._chatHistory.push({ role: "assistant", content: lastModelOutput });
      this._view?.webview.postMessage({ type: "onEnd" });

      const tags = this._parseTags(lastModelOutput);
      if (tags.length > 0) {
        this._view?.webview.postMessage({
          type: "onStatus",
          value: `Agente processando ${tags.length} ferramenta(s)...`,
        });
        let toolResults = "";
        for (const tag of tags) {
          this._view?.webview.postMessage({
            type: "onToolStart",
            id: tag.id,
            name: tag.name,
            attributes: tag.attributes,
            content: tag.content,
          });
          const result = await this._executeTool(
            tag.name,
            tag.attributes,
            tag.content,
          );
          this._view?.webview.postMessage({ type: "onToolEnd", id: tag.id });
          toolResults += `\nOutput of <${tag.name}>:\n${result}\n`;
        }
        this._chatHistory.push({ role: "user", content: toolResults });
        turn++;
      } else {
        shouldContinue = false;
      }
    }

    if (turn >= maxTurns) {
      this._view?.webview.postMessage({
        type: "onError",
        value: "Limite de turnos (10) atingido para esta tarefa.",
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "main.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "main.css"),
    );
    const isDocker = process.env.DOCKERIZED === "true";
    const securityLabel = isDocker
      ? "SKYNET: DOCKER READY 🚢"
      : "IRON SHELL: ANTI-BLEED 🛡️";

    return `<!DOCTYPE html><html lang="en"><head>
        <meta charset="UTF-8"><link href="${styleUri}" rel="stylesheet"></head>
      <body>
        <div class="container">
            <div id="hud-v3" class="hud-container">
                <div id="security-status-v2" class="hud-status-label">${securityLabel}</div>
                <div id="qa-sentinel-status" class="hud-status-label">SENTINELA QA: STANDBY 🛡️</div>
                <div id="mcp-protocol-status" class="hud-status-label">MCP SERVER: OFF 🔌</div>
                <div id="subagents-army-status" class="hud-status-label">EXÉRCITO: 0 🪖</div>
                <div id="forge-skills-status" class="hud-status-label">FORJA: 0 🛠️</div>
                <div id="telegram-badge" class="hud-status-label">📱 TELEGRAM: SINAL ENVIADO</div>
                <div id="agent-status-label" class="hud-status-label" style="color: #ffcc44; font-weight: bold;">AGENTE: STANDBY 🤖</div>
            </div>

            <div class="control-panel">
                <div class="model-selection-wrapper">
                    <label for="model-selector" class="hud-status-label">🤖 MODELO OPERACIONAL:</label>
                    <select id="model-selector">
                        <option value="">Carregando arsenal...</option>
                    </select>
                </div>

                <div class="vault-container">
                    <div class="vault-header">
                        <span class="vault-title">🔐 COFRE DO ARSENAL</span>
                        <button id="add-provider-btn" class="vault-add-btn" title="Adicionar Novo Cérebro">+</button>
                    </div>
                    
                    <div id="vault-list" class="vault-list">
                        <!-- Telegram Fixed -->
                        <div class="vault-item fixed" id="telegram-config">
                            <div class="vault-item-info">
                                <span class="vault-item-name">📱 Telegram (Fixo)</span>
                                <span id="telegram-status" class="vault-status-indicator locked">🔒</span>
                            </div>
                            <div class="vault-item-actions">
                                <button class="vault-item-btn edit" onclick="toggleTelegramForm()">⚙️</button>
                            </div>
                        </div>
                        <div id="telegram-form" class="vault-inline-form" style="display:none;">
                            <input type="password" id="tg-token" placeholder="Bot Token">
                            <input type="text" id="tg-chat-id" placeholder="Chat ID">
                            <button onclick="saveTelegram()">Salvar</button>
                        </div>

                        <!-- Dynamic Providers -->
                        <div id="dynamic-providers-list"></div>
                    </div>
                </div>
            </div>

            <!-- Modal for Adding Provider -->
            <div id="add-provider-modal" class="modal">
                <div class="modal-content">
                    <h3>Injetar Novo Cérebro</h3>
                    <div class="template-actions" style="margin-bottom: 10px; display: flex; gap: 5px;">
                        <button id="load-groq-template" class="template-btn" onclick="loadTemplate('groq')" style="background: #f55036; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; flex: 1;">🚀 Carregar Template Groq</button>
                    </div>
                    <input type="text" id="new-p-name" placeholder="Nome do Provedor (ex: DeepSeek)">
                    <input type="text" id="new-p-model" placeholder="Model ID (ex: deepseek-chat)">
                    <input type="text" id="new-p-url" placeholder="Base URL (ex: https://api.deepseek.com)">
                    <input type="password" id="new-p-key" placeholder="API Key">
                    <div class="modal-actions">
                        <button id="modal-cancel">Cancelar</button>
                        <button id="modal-save" class="primary">Injetar</button>
                    </div>
                </div>
            </div>

            <div id="chat-container"></div>
            <div id="input-container">
                <div class="chat-input-wrapper">
                    <button id="clip-btn" class="clip-btn" title="Anexar Arquivo">📎</button>
                    <textarea id="user-input" placeholder="Pergunte ao Agente..."></textarea>
                    <button id="send-btn" class="send-btn" title="Enviar Mensagem">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button id="reset-btn" class="factory-reset-btn" style="margin-top: 10px; font-size: 10px; opacity: 0.5;">🔄 Factory Reset</button>
        </div>

        <!-- Tactical Modal (Sandbox Bypass) -->
        <div id="custom-modal" class="custom-modal">
            <div class="custom-modal-content">
                <div id="custom-modal-header" class="custom-modal-header">CONFIRMAÇÃO EXIGIDA</div>
                <div id="custom-modal-body" class="custom-modal-body">Deseja prosseguir com a operação?</div>
                <div class="custom-modal-actions">
                    <button id="custom-modal-abort" class="tactical-btn abort">ABORTAR</button>
                    <button id="custom-modal-confirm" class="tactical-btn confirm">CONFIRMAR EXPURGO</button>
                </div>
            </div>
        </div>

        <script src="${scriptUri}"></script></body></html>`;
  }
}
