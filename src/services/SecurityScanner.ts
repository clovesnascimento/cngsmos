import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Iron Shell (v1.1) - Módulo de Preflight de Segurança
 * Responsável por validar comandos antes da execução no host ou sandbox.
 */
export class SecurityScanner {
    private static readonly DANGEROX_ENV_VARS = [
        "LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT",
        "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH",
        "NODE_OPTIONS", "NODE_PATH",
        "PYTHONPATH", "PYTHONHOME",
        "BASH_ENV", "ENV"
    ];

    private static readonly FORGE_BLOCKED_LIBS = [
        "child_process", "cluster", "dgram", "os", "v8", "vm", "worker_threads"
    ];

    private static readonly DANGEROUS_COMMANDS = [
        "netsh", "ufw", "iptables", "firewall-cmd",
        "systemctl stop", "service stop", "stop-service",
        "set-executionpolicy", "sc config", "reg add", "reg delete",
        "rm -rf /", "del /s /q c:\\windows"
    ];

    private static readonly RESTRICTED_DOMAINS = [
        "bank", "itau", "bradesco", "santander", "caixa", "nubank",
        "paypal", "stripe", "binance", "coinbase",
        "gmail.com", "outlook.com", "protonmail",
        "facebook.com", "instagram.com", "twitter.com", "x.com"
    ];

    private static readonly AUTHORIZED_MODELS = [
        "gemini-3.1-pro", "gemini-3-flash", "gemini-1.5-pro",
        "claude-sonnet-4.6-thinking", "claude-opus-4.6-thinking",
        "gpt-oss-120b", "qwen3.5", "qwen3-coder-next", "glm-5",
        "minimax-m2.5", "kimi-k2.5", "deepseek-chat", "deepseek-reasoner",
        "grok-beta", "mistral-large-latest", "glm-4", "llama3.3"
    ];

    private static readonly CRAWL_DEPTH_LIMIT = 2;

    /**
     * Valida se o modelo selecionado é autorizado. (v1.2.5)
     */
    public static validateModel(modelId: string): { isValid: boolean; reason?: string; severity?: 'high' | 'warning' } {
        if (!this.AUTHORIZED_MODELS.includes(modelId)) {
            this.logAudit(`SELECT MODEL: ${modelId}`, "Model Hijacking Detected");
            return {
                isValid: false,
                reason: `⚠️ ACESSO NEGADO: O modelo '${modelId}' não é um endpoint autorizado pelo Iron Shell.`,
                severity: 'high'
            };
        }
        return { isValid: true };
    }

    /**
     * Valida o domínio/URL para navegação. (v1.3.5 - Denylist > Allowlist)
     */
    public static validateNavigation(url: string): { isValid: boolean; reason?: string; severity?: 'high' | 'warning'; needsApproval?: boolean } {
        const lowerUrl = url.toLowerCase();
        
        // 1. Camada 1: Denylist (Bloqueio Absoluto)
        for (const restricted of this.RESTRICTED_DOMAINS) {
            if (lowerUrl.includes(restricted)) {
                this.logAudit(`NAVIGATE (DENY): ${url}`, `Selo de Aço: Domínio Restrito Bloqueado (${restricted})`);
                return {
                    isValid: false,
                    reason: `⚠️ ACESSO NEGADO: O domínio '${restricted}' está na DENYLIST e é permanentemente bloqueado pelo Iron Shell (v1.3.5).`,
                    severity: 'high'
                };
            }
        }

        // 2. Camada 2: Allowlist (Círculo de Confiança)
        if (this.isDomainInAllowlist(url)) {
            return { isValid: true };
        }

        // 3. Intersecção: Solicitar Aprovação
        this.logAudit(`NAVIGATE (UNTRUSTED): ${url}`, "Aguardando aprovação via HUD");
        return {
            isValid: false,
            reason: `⚠️ ACESSO RESTRITO: O domínio não está na sua ALLOWLIST. Deseja permitir o acesso?`,
            severity: 'warning',
            needsApproval: true
        };
    }

    public static validateIngestion(url: string, depth: number): boolean {
        if (depth > this.CRAWL_DEPTH_LIMIT) return false;
        return this.validateNavigation(url).isValid;
    }

    /**
     * Prevencao de Envenenamento de Dados (v1.4.1)
     */
    public static sanitizeContent(content: string): string {
        // Remove tags <script>, <iframe>, e atributos on* maliciosos
        return content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[REMOVED SCRIPT]")
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "[REMOVED IFRAME]")
            .replace(/\bon\w+="[^"]*"/gi, "[REMOVED EVENT]");
    }

    private static isDomainInAllowlist(url: string): boolean {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) return false;
            
            const allowlistPath = path.join(workspaceRoot, 'allowlist.txt');
            if (!fs.existsSync(allowlistPath)) return false;

            const content = fs.readFileSync(allowlistPath, 'utf8');
            const allowedDomains = content.split('\n').map(d => d.trim().toLowerCase()).filter(d => d !== "");
            
            const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
            const host = urlObj.hostname.toLowerCase();

            return allowedDomains.some(allowed => host === allowed || host.endsWith('.' + allowed));
        } catch (e) {
            return false;
        }
    }

    public static async addToAllowlist(domain: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) return;
        
        const allowlistPath = path.join(workspaceRoot, 'allowlist.txt');
        const content = fs.readFileSync(allowlistPath, 'utf8');
        if (!content.includes(domain)) {
            fs.appendFileSync(allowlistPath, `\n${domain}`);
            this.logAudit(`ALLOWLIST_UPDATE: ${domain}`, "Adicionado via HUD (Sempre Permitir)");
        }
    }

    public static validateCommand(command: string): { isValid: boolean; reason?: string; severity?: 'high' | 'warning' } {
        const upperCommand = command.toUpperCase();

        const assignmentRegex = /(?:SET|EXPORT|ENV)\s+([A-Z_]+)=|([A-Z_]+)=/gi;
        let match;
        while ((match = assignmentRegex.exec(command)) !== null) {
            const varName = (match[1] || match[2]).toUpperCase();
            if (varName.endsWith("PATH") || this.DANGEROX_ENV_VARS.includes(varName)) {
                this.logAudit(command, `Selo de Aço: Atribuição Crítica Bloqueada (${varName})`);
                return { 
                    isValid: false, 
                    reason: `⚠️ COMANDO BLOQUEADO: Violação de Segurança Nível 3 detectada. Manipulação de variável '${varName}' é proibida.`,
                    severity: 'high'
                };
            }
        }

        const bleedResult = this.detectShellBleed(command);
        if (!bleedResult.isValid) {
            this.logAudit(command, `Anti-Bleed Shield: ${bleedResult.reason}`);
            return {
                isValid: false,
                reason: `⚠️ BLOQUEIO ANTI-BLEED: ${bleedResult.reason}`,
                severity: 'high'
            };
        }

        for (const cmd of this.DANGEROUS_COMMANDS) {
            if (upperCommand.includes(cmd.toUpperCase())) {
                this.logAudit(command, `Violação de Comando: ${cmd}`);
                return { 
                    isValid: false, 
                    reason: `⚠️ COMANDO BLOQUEADO: Uso de comando restrito de sistema (${cmd}).`,
                    severity: 'warning'
                };
            }
        }

        const riskKeywords = ["rm", "del", "rd", "format", "mkfs", "dd", "chmod", "chown", "net", "user", "pass", "set", "export", "env"];
        const chains = command.split(/[;&|]/);
        if (chains.length > 1) {
            for (let i = 1; i < chains.length; i++) {
                const subCommand = chains[i].trim().toLowerCase();
                if (riskKeywords.some(kw => subCommand.startsWith(kw) || subCommand.includes(" " + kw))) {
                    this.logAudit(command, "Violação de Encadeamento de Risco (Selo de Aço)");
                    return { 
                        isValid: false, 
                        reason: "⚠️ COMANDO BLOQUEADO: Encadeamento de comandos suspeito detectado (Iron Shell v1.1.2).",
                        severity: 'high'
                    };
                }
            }
        }

        return { isValid: true };
    }

    private static detectShellBleed(command: string): { isValid: boolean; reason?: string } {
        const lowerCmd = command.toLowerCase();
        
        const bleedPatterns = [
            { regex: /\b(export|set|unset|env)\b\s+[^&|;]*/i, label: 'Atribuição Direta' },
            { regex: /\bpath\s*=\s*/i, label: 'Manipulação de $PATH' },
            { regex: /\bsetx\b/i, label: 'Persistência de Variáveis (Windows)' }
        ];

        for (const pattern of bleedPatterns) {
            if (pattern.regex.test(lowerCmd)) {
                return { isValid: false, reason: `Tentativa de injeção detectada via [${pattern.label}]` };
            }
        }

        for (const envVar of this.DANGEROX_ENV_VARS) {
            if (lowerCmd.includes(envVar.toLowerCase())) {
                return { isValid: false, reason: `Uso de variável restrita (${envVar}) no comando.` };
            }
        }

        return { isValid: true };
    }

    /**
     * Auditoria de Skills Geradas (v3.0)
     * Garante que o código forjado não use bibliotecas proibidas ou acesse o host de forma insegura.
     */
    public static auditForgedSkill(code: string): { isValid: boolean; reason?: string } {
        for (const lib of this.FORGE_BLOCKED_LIBS) {
            const importRegex = new RegExp(`(import|require)\\s*.*from\\s*['\"]${lib}['\"]|require\\s*\\(['\"]${lib}['\"]\\)`, 'i');
            if (importRegex.test(code)) {
                return { isValid: false, reason: `Uso proibido da biblioteca de sistema: ${lib}` };
            }
        }

        if (/\beval\s*\(|new\s+Function\s*\(/.test(code)) {
            return { isValid: false, reason: "Uso proibido de eval() ou Function constructor detectado." };
        }

        if (/['\"]([a-zA-Z]:\\|\/)(?!Users).+['\"]/i.test(code)) {
            return { isValid: false, reason: "Tentativa de acesso a caminhos absolutos do sistema detectada." };
        }

        return { isValid: true };
    }

    private static logAudit(command: string, reason: string): void {
        const timestamp = new Date().toISOString();
        console.warn(`[IRON SHELL AUDIT][${timestamp}] BLOCKED: "${command}" | REASON: ${reason}`);
        
        const channel = vscode.window.createOutputChannel("CNGSM Iron Shell Audit");
        channel.appendLine(`[${timestamp}] BLOCKED: "${command}"`);
        channel.appendLine(`REASON: ${reason}`);
        channel.show(true);
    }
}
