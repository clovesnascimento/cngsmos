window.addEventListener('DOMContentLoaded', () => {
  const vscode = acquireVsCodeApi();
  const chatHistory = document.getElementById("chat-container");
  const promptInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");

  if (!chatHistory || !promptInput || !sendBtn) {
    console.warn("CRITICAL: DOM elements missing. Interface status: compromised.");
  }

  // Dynamic Architecture v16.0
  const modelSelector = document.getElementById("model-selector");
  const addProviderBtn = document.getElementById("add-provider-btn");
  const addModal = document.getElementById("add-provider-modal");
  const modalCancel = document.getElementById("modal-cancel");
  const modalSave = document.getElementById("modal-save");
  const dynamicList = document.getElementById("dynamic-providers-list");

  // Multi-step modal/form logic
  if (addProviderBtn) addProviderBtn.onclick = () => addModal.classList.add("active");
  if (modalCancel) modalCancel.onclick = () => addModal.classList.remove("active");
  
  if (modalSave) {
      modalSave.onclick = () => {
          const name = document.getElementById("new-p-name").value;
          const modelId = document.getElementById("new-p-model").value;
          const baseUrl = document.getElementById("new-p-url").value;
          const apiKey = document.getElementById("new-p-key").value;

          if (!name || !modelId) {
              // We'll just show a tactical notification here instead of alert
              const agentLabel = document.getElementById("agent-status-label");
              if (agentLabel) agentLabel.innerText = "ERRO: NOME E MODEL ID OBRIGATÓRIOS. ⚠️";
              return;
          }

          vscode.postMessage({
              type: "addProvider",
              name, modelId, baseUrl, apiKey
          });

          addModal.classList.remove("active");
          // Clear inputs
          ["new-p-name", "new-p-model", "new-p-url", "new-p-key"].forEach(id => document.getElementById(id).value = "");
      };
  }

  // Tactical Modal Helper
  window.showTacticalModal = (title, body, onConfirm) => {
      const modal = document.getElementById("custom-modal");
      const header = document.getElementById("custom-modal-header");
      const bodyEl = document.getElementById("custom-modal-body");
      const confirmBtn = document.getElementById("custom-modal-confirm");
      const abortBtn = document.getElementById("custom-modal-abort");

      header.innerText = title;
      bodyEl.innerText = body;
      modal.classList.add("active");

      confirmBtn.onclick = () => {
          onConfirm();
          modal.classList.remove("active");
      };

      abortBtn.onclick = () => {
          modal.classList.remove("active");
      };
  };
  
  // Template Loader v1.0
  window.loadTemplate = (type) => {
      // 1. Reset State (Clear fields)
      ["new-p-name", "new-p-model", "new-p-url", "new-p-key"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
      });

      // 2. Load Template Data
      if (type === 'groq') {
          document.getElementById("new-p-name").value = "Llama 3.3 (Líder Técnico)";
          document.getElementById("new-p-model").value = "llama-3.3-70b-versatile";
          document.getElementById("new-p-url").value = "https://api.groq.com/openai/v1";
          
          console.log("Template Groq atualizado para Llama 3.3 Versatile.");

          // 3. Focus on API Key
          const keyInput = document.getElementById("new-p-key");
          if (keyInput) keyInput.focus();

          // Visual Feedback
          const agentLabel = document.getElementById("agent-status-label");
          if (agentLabel) agentLabel.innerText = "AGENTE: TEMPLATE GROQ CARREGADO 🚀";
      }
  };

  // Model Selection
  if (modelSelector) {
    modelSelector.addEventListener("change", (e) => {
      vscode.postMessage({
        type: "updateModel",
        model: e.target.value,
      });
    });
  }

  // Global Helpers for Webview
  window.toggleTelegramForm = () => {
      const form = document.getElementById("telegram-form");
      form.style.display = form.style.display === "none" ? "block" : "none";
  };

  window.saveTelegram = () => {
      const token = document.getElementById("tg-token").value;
      const chatId = document.getElementById("tg-chat-id").value;
      vscode.postMessage({ type: "saveTelegramKeys", token, chatId });
      document.getElementById("telegram-form").style.display = "none";
  };

  window.removeProvider = (id) => {
      window.showTacticalModal(
          "CONFIRME O EXPURGO",
          "Deseja remover este cérebro do arsenal definitivamente?",
          () => {
              console.log(`[FE] Solicitando remoção do provedor: ${id}`);
              const agentLabel = document.getElementById("agent-status-label");
              if (agentLabel) agentLabel.innerText = "AGENTE: REMOVENDO PROVEDOR... 🤖";
              vscode.postMessage({ type: "removeProvider", providerId: id });
          }
      );
  };

  // Factory Reset
  const factoryResetBtn = document.getElementById("reset-btn");
  if (factoryResetBtn) {
    factoryResetBtn.addEventListener("click", () => {
        window.showTacticalModal(
            "ALERTA DE SEGURANÇA",
            "PERIGO: Deseja apagar TODO o arsenal e configurações? Esta ação é irreversível.",
            () => {
                console.log("[FE] Solicitando Factory Reset total via Tactical Modal.");
                const agentLabel = document.getElementById("agent-status-label");
                if (agentLabel) agentLabel.innerText = "AGENTE: EXPURGANDO SISTEMAS... 🤖";
                vscode.postMessage({ type: "onReset" });
            }
        );
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const text = promptInput.value;
      if (text) {
        addMessage("user", text);
        vscode.postMessage({
          type: "onPrompt",
          value: text,
        });
        promptInput.value = "";
        promptInput.style.height = "auto";
      }
    });
  }

  if (promptInput) {
    promptInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    promptInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = (this.scrollHeight) + "px";
    });
  }

  // === MULTIMODAL ARSENAL: Clip Button (📎) ===
  const clipBtn = document.getElementById("clip-btn");
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*,.pdf,.txt,.js,.ts,.py,.json,.md,.csv";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  if (clipBtn) {
    clipBtn.addEventListener("click", () => {
      fileInput.click();
    });
  }

  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files);
    if (files.length === 0) return;

    const promises = files.map(f => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(",")[1];
          resolve({ name: f.name, type: f.type, base64 });
        };
        reader.readAsDataURL(f);
      });
    });

    Promise.all(promises).then((results) => {
      vscode.postMessage({ type: "uploadFiles", files: results });
      // Visual feedback
      const agentLabel = document.getElementById("agent-status-label");
      if (agentLabel) {
        agentLabel.innerText = `AGENTE: ${results.length} ARQUIVO(S) ANEXADO(S) 📎`;
      }
    });

    fileInput.value = ""; // Reset for next upload
  });

  // Security UI Elements
  const container = document.querySelector(".container");
  if (container) {
    const securityHud = document.createElement("div");
    securityHud.className = "security-hud";
    securityHud.id = "security-hud-element";
    securityHud.innerHTML = `
      <div class="security-hud-header">IRON SHELL: VIGILÂNCIA ATIVA</div>
      <div id="security-hud-body" class="security-hud-body">Sistema Nominal.</div>
      <div id="browser-status-bar" class="browser-status-bar">EXT: CHROME ACTIVE: 🔵 (Aguardando Conexão)</div>
      <div id="background-processes-container" class="background-processes-hud">
          <div class="hud-status-label">PROCESSOS ATIVOS (Background):</div>
          <div id="active-processes-list" class="active-processes-list">Nenhum processo em execução.</div>
      </div>
      <div id="indexing-label" class="indexing-label">Indexando Memória...</div>
      <div id="indexing-container" class="indexing-container">
        <div id="indexing-bar" class="indexing-bar"></div>
      </div>
    `;
    container.prepend(securityHud);

    window.securityHudRef = securityHud;
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    const securityHud = window.securityHudRef;

    switch (message.type) {
      case "onToken":
        if (currentResponseElement) {
          ensureActiveTextNode(currentResponseElement);
          window.activeTextNode.nodeValue += message.value;
          scrollToBottom();
        } else {
          currentResponseElement = addMessage("cngsm", message.value);
          ensureActiveTextNode(currentResponseElement);
        }
        break;
      case "onStart":
        currentResponseElement = addMessage("cngsm", "");
        window.activeTextNode = null; 
        break;
      case "onEnd":
        currentResponseElement = null;
        window.activeTextNode = null;
        break;
      case "onToolStart":
        if (currentResponseElement) {
            // Finish current text node and inject chip
            injectTacticalChip(currentResponseElement, message);
            // After injection, subsequent tokens should go into a NEW text node
            window.activeTextNode = null; 
        }
        break;
      case "onToolEnd":
        const endIcon = document.getElementById(`status-icon-${message.id}`);
        if (endIcon) {
            endIcon.classList.remove("spinning");
            endIcon.innerText = "✅";
        }
        break;
      case "onTelegramSent":
        const badge = document.getElementById("telegram-badge");
        if (badge) {
            badge.style.display = "block";
            setTimeout(() => { badge.style.display = "none"; }, 5000); // Pulse for 5s
        }
        break;
      case "onError":
        addMessage("error", "Error: " + message.value);
        currentResponseElement = null;
        break;
      case "onSecurityAlert":
        showSecurityAlert(
          message.value,
          message.command,
          message.severity,
          message.needsApproval,
          message.domain,
        );
        break;
      case "onIndexingUpdate":
        updateIndexingProgress(message.value, message.source);
        break;
      case "onBrowserStatus":
        updateBrowserStatus(message.value, message.port);
        break;
      case "onMcpStatus":
        const mcpLabel = document.getElementById("mcp-protocol-status");
        if (mcpLabel) {
            mcpLabel.innerText = `PROTOCOLO: MCP SERVER (${message.value.toUpperCase()}) 🔌`;
            mcpLabel.style.color =
            message.value === "online" ? "#44ff44" : "#ff4444";
        }
        break;
      case "onSubAgentsUpdate":
        const armyLabel = document.getElementById("subagents-army-status");
        if (armyLabel) {
            armyLabel.innerText = `EXÉRCITO: ${message.value} SUBAGENTES ATIVOS 🪖`;
            armyLabel.style.color = message.value > 0 ? "#44ccff" : "#aaaaaa";
        }
        break;
      case "onSkillsUpdate":
        const forgeLabel = document.getElementById("forge-skills-status");
        if (forgeLabel) {
            forgeLabel.innerText = `FORJA: ${message.value} SKILLS GERADAS 🛠️`;
            forgeLabel.style.color = message.value > 0 ? "#ffcc44" : "#aaaaaa";
        }
        break;
      case "onBrowserEvent":
        handleBrowserEvent(message);
        break;
      case "onBackgroundProcessesUpdate":
        updateBackgroundProcesses(message.value);
        break;
      case "onSystemPromptReset":
        addMessage(
          "reset-confirmation",
          "✅ BLINDAGEM ATIVA: System Prompt restaurado para os padrões de fábrica com sucesso. Núcleo cognitivo seguro.",
        );
        break;
      case "onResetSuccess":
        if (chatHistory) chatHistory.innerHTML = "";
        addMessage("security-warning", "⚙️ EXPURGO CONCLUÍDO: Todos os sistemas foram resetados.");
        break;
      case "onQaStatus":
        const qaLabel = document.getElementById("qa-sentinel-status");
        if (qaLabel) {
          qaLabel.innerText = `SENTINELA QA: ${message.value.toUpperCase()} 🛡️`;
          qaLabel.style.color =
            message.value === "pass"
              ? "#44ff44"
              : message.value === "running"
                ? "#ffcc44"
                : "#aaaaaa";
        }
        break;
      case "onVaultStatusUpdate":
        const { providers, telegram } = message;
        
        // 1. Update Telegram Status
        const tgIndicator = document.getElementById("telegram-status");
        if (tgIndicator) {
            tgIndicator.className = `vault-status-indicator ${telegram.hasToken ? 'unlocked' : 'locked'}`;
            tgIndicator.innerText = telegram.hasToken ? '🔓' : '🔒';
        }

        // 2. Update Model Selector
        if (modelSelector) {
            modelSelector.innerHTML = providers.length > 0 
                ? providers.map(p => `<option value="${p.modelId}">${p.name} (${p.modelId})</option>`).join('')
                : '<option value="">Nenhum cérebro detectado. Adicione um no Cofre.</option>';
        }

        // 3. Update Provider List in Vault
        if (dynamicList) {
            dynamicList.innerHTML = providers.map(p => `
                <div class="vault-item">
                    <div class="vault-item-info">
                        <span class="vault-item-name">${p.name}</span>
                        <span class="vault-item-model">${p.modelId}</span>
                    </div>
                    <div class="vault-item-actions">
                        <button class="vault-item-btn delete" onclick="removeProvider('${p.id}')" title="Remover">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
        break;
      case "onStatus":
        const agentLabel = document.getElementById("agent-status-label");
        if (agentLabel) {
            agentLabel.innerText = `AGENTE: ${message.value.toUpperCase()} 🤖`;
            
            // ARCHITECTURAL FEEDBACK (Mocking voice feedback in status if needed, or just standard status)
            if (message.value.includes("modular")) {
                console.log("Comandante, a arquitetura agora é totalmente modular. Você detém o controle total sobre quais provedores e cérebros o sistema deve utilizar.");
            }
        }
        break;
      case "updateModel":
        if (modelSelector) {
          const existingOpt = modelSelector.querySelector(`option[value="${message.model}"]`);
          if (existingOpt) {
            existingOpt.selected = true;
          } else {
            const opt = document.createElement("option");
            opt.value = message.model;
            opt.textContent = message.model;
            opt.selected = true;
            if (modelSelector.options.length === 1 && modelSelector.options[0].value === "") {
              modelSelector.innerHTML = "";
            }
            modelSelector.appendChild(opt);
          }
        }
        break;
    }
  });

  function updateBrowserStatus(status, port) {
    const bar = document.getElementById("browser-status-bar");
    const securityHud = window.securityHudRef;
    if (status === "connected") {
      if (bar) {
        bar.innerText = `EXT: CHROME ACTIVE: 🟢 (${port || "9222"})`;
        bar.classList.add("active");
      }
      if (securityHud) securityHud.classList.add("active");
    } else {
      if (bar) {
        bar.innerText = "EXT: CHROME ACTIVE: 🔵 (Aguardando Conexão)";
        bar.classList.remove("active");
      }
    }
  }

  function handleBrowserEvent(data) {
    const body = document.getElementById("security-hud-body");
    const securityHud = window.securityHudRef;
    if (body) {
        body.innerText = `BROWSER: ${data.event}\nURL: ${data.url || "N/A"}\nVAL: ${data.value || ""}`;
    }

    // Update Allowlist Status based on URL
    if (data.url) {
      const label = document.getElementById("allowlist-status");
      if (label) {
        if (data.url.includes("localhost") || data.url.includes("127.0.0.1")) {
            label.innerHTML = `ALLOWLIST STATUS: 🟢 (Localhost)`;
        } else {
            label.innerHTML = `ALLOWLIST STATUS: 🟡 (Externo/Restrito)`;
        }
      }
    }

    if (securityHud) securityHud.classList.add("active");
  }

  function updateIndexingProgress(percent, source) {
    const containerIdx = document.getElementById("indexing-container");
    const bar = document.getElementById("indexing-bar");
    const label = document.getElementById("indexing-label");
    const securityHud = window.securityHudRef;

    if (securityHud) securityHud.classList.add("active");
    if (containerIdx) containerIdx.classList.add("active");
    if (label) label.classList.add("active");

    if (label) {
        if (source === "web") {
            label.innerHTML = `🌐 Ingerindo Memória Viva... (${percent}%)`;
        } else {
            label.innerText = `Indexando Memória local... (${percent}%)`;
        }
    }

    if (bar) bar.style.width = `${percent}%`;

    if (percent >= 100) {
      setTimeout(() => {
        if (containerIdx) containerIdx.classList.remove("active");
        if (label) label.classList.remove("active");
        if (securityHud && !securityHud.classList.contains("violation")) {
          // securityHud.classList.remove("active");
        }
      }, 2000);
    }
  }

  function updateBackgroundProcesses(processes) {
    const list = document.getElementById("active-processes-list");
    const securityHud = window.securityHudRef;
    if (!list) return;

    if (processes.length === 0) {
      list.innerText = "Nenhum processo em execução.";
      return;
    }

    list.innerHTML = processes
      .map(
        (p) => `
        <div class="process-item">
            <span>PID: ${p.pid} | CMD: ${p.command.substring(0, 30)}...</span>
            <button class="kill-btn" onclick="vscode.postMessage({type: 'killProcess', pid: ${p.pid}})">Terminar</button>
        </div>
    `,
      )
      .join("");

    if (securityHud) securityHud.classList.add("active");
  }

  function showSecurityAlert(reason, command, severity, needsApproval, domain) {
    const securityHud = window.securityHudRef;
    if (!securityHud) return;

    securityHud.className = "security-hud active";
    securityHud.classList.add(severity || "high");

    if (severity === "high") {
      securityHud.classList.add("violation");
    }

    const body = document.getElementById("security-hud-body");
    if (body) {
        body.innerText = `ALVO: ${command}\nMOTIVO: ${reason}`;

        // v1.3.5: Interação de Aprovação
        if (needsApproval && domain) {
            const approveBtn = document.createElement("button");
            approveBtn.className = "approve-btn";
            approveBtn.innerText = `Sempre Permitir: ${domain}`;
            approveBtn.onclick = () => {
                vscode.postMessage({ type: "allowDomain", domain: domain });
                approveBtn.remove();
                body.innerText = `Domínio ${domain} liberado. Tente novamente.`;
            };
            body.appendChild(approveBtn);
        }
    }

    const msgClass =
      severity === "warning" ? "security-warning" : "security-violation";
    addMessage(
      msgClass,
      `🚨 BLOQUEIO IRON SHELL (${severity?.toUpperCase() || "HIGH"})\n${reason}\nAlvo: ${command}`,
    );

    setTimeout(() => {
      if (!needsApproval) {
        // securityHud.classList.remove("active");
      }
    }, 8000);
  }

  function addMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role}`;
    msgDiv.innerText = text;
    if (chatHistory) {
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
    }
    return msgDiv;
  }

  function scrollToBottom() {
    if (chatHistory) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  function ensureActiveTextNode(element) {
    if (!window.activeTextNode) {
        window.activeTextNode = document.createTextNode("");
        element.appendChild(window.activeTextNode);
    }
  }

  function injectTacticalChip(element, toolData) {
    const tagName = toolData.name;
    const toolId = toolData.id;
    
    // 1. We need to REMOVE the raw tag text from the current text node(s)
    // This is tricky because the tag might be split across nodes or still incomplete.
    // However, the backend only triggers onToolStart AFTER it has parsed the FULL tag.
    // So the full tag text MUST be in the preceding text nodes.
    
    // For simplicity, we'll look for the tag in the WHOLE innerText and replace it.
    // Since we are now using nodes, we'll find the text nodes and clean them up.
    
    const tagToFind = `<${tagName}`; // Minimum trigger
    // Actually, let's just use a more aggressive cleanup:
    const nodes = Array.from(element.childNodes);
    for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Remove any trailing XML-like strings that match this tool
            // The LLM might have sent <write_file path="...">... content ...</write_file>
            // We'll replace the last occurrence of the full tag pattern.
            const regex = new RegExp(`<${tagName}\\s*[^>]*?>(?:[\\s\\S]*?<\\/${tagName}>|\\/?>)`, "g");
            if (node.nodeValue.match(regex)) {
                node.nodeValue = node.nodeValue.replace(regex, "");
            } else {
                // Partial cleanup if the tag is at the very end
                node.nodeValue = node.nodeValue.split(`<${tagName}`)[0];
            }
        }
    }

    const attrStr = Object.entries(toolData.attributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");

    const chipDiv = document.createElement("div");
    chipDiv.className = "xml-tool-chip";
    chipDiv.id = `chip-${toolId}`;
    chipDiv.innerHTML = `
        <div class="xml-tool-header">
            <span class="xml-tool-name">${tagName}</span>
            <div class="xml-tool-actions">
                <span id="status-icon-${toolId}" class="xml-tool-status-icon active spinning">⚙️</span>
                <button class="xml-tool-details-btn" id="btn-${toolId}" onclick="toggleChipDetails('${toolId}')">Ver Detalhes</button>
            </div>
        </div>
        <div class="xml-tool-content-wrapper" id="content-${toolId}">
            <div class="xml-tool-attributes">${attrStr}</div>
            <pre style="margin:0; white-space: pre-wrap;">${toolData.content || ""}</pre>
        </div>
    `;

    element.appendChild(chipDiv);
    scrollToBottom();
  }

  window.toggleChipDetails = (id) => {
    const content = document.getElementById(`content-${id}`);
    const btn = document.getElementById(`btn-${id}`);
    if (content && btn) {
        content.classList.toggle("open");
        btn.classList.toggle("open");
        btn.innerText = content.classList.contains("open") ? "Ocultar" : "Ver Detalhes";
    }
  };
});
