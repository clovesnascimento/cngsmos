import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { LlmClient, ChatMessage } from "./LlmClient";
import { BackgroundTaskManager } from "./BackgroundTaskManager";

export interface SubAgentMetadata {
    id: string;
    role: string;
    task: string;
    status: 'working' | 'completed' | 'failed';
    startTime: number;
}

/**
 * OrchestratorService (🪖 General v3.0)
 * Gerencia o ciclo de vida de subagentes e a delegação de tarefas.
 */
export class OrchestratorService {
    private _subAgents: Map<string, SubAgent> = new Map();
    private _llmClient: LlmClient;

    constructor(
        private readonly _backgroundManager: BackgroundTaskManager,
        private readonly _onUpdate: (count: number) => void,
        private readonly _onCuraStatus: (status: string) => void
    ) {
        this._llmClient = new LlmClient();
    }

    /**
     * Spawna um novo subagente especialista.
     */
    public async spawnSubAgent(role: string, task: string): Promise<string> {
        const id = `AGENT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const agent = new SubAgent(id, role, this._llmClient);
        
        this._subAgents.set(id, agent);
        this._notifyUpdate();

        // Execução em Background (Assíncrona)
        agent.runTask(task).then(() => {
            console.log(`[CNGSM] SubAgent ${id} completed mission.`);
            this._subAgents.delete(id);
            this._notifyUpdate();
        }).catch((err) => {
            console.error(`[CNGSM] SubAgent ${id} failed:`, err);
            this._subAgents.delete(id);
            this._notifyUpdate();
        });

        return id;
    }

    /**
     * Responde a falhas de background (SOS).
     */
    public async handleCrash(pid: number, command: string, lastLogs: string[]): Promise<void> {
        this._onCuraStatus('CURA ESPONTÂNEA: NEUTRALIZANDO FALHA 🧬');
        
        const logsSnippet = lastLogs.join('\n');
        const debugTask = `O processo (PID: ${pid}) que rodava o comando "${command}" falhou.
Últimos logs de erro (stderr):
${logsSnippet}

Sua missão:
1. Analise o erro.
2. Use vector_search e web_search para achar a solução se necessário.
3. Use read_file e write_file para CORRIGIR o arquivo defeituoso.
4. Tente ser o mais cirúrgico possível.
5. Reporte o resultado final no chat interno.`;

        console.log(`[CNGSM] SOS Recebido! Iniciando Cura Espontânea para PID ${pid}.`);
        await this.spawnSubAgent('Debugger', debugTask);
        
        // Simulação de tempo de reparo (em um cenário real, o subagente finalizaria a tarefa)
        setTimeout(() => {
            this._onCuraStatus('SENTINELA QA: STANDBY 🛡️'); // Reset status
        }, 15000);
    }

    public getActiveCount(): number {
        return this._subAgents.size;
    }

    private _notifyUpdate() {
        this._onUpdate(this.getActiveCount());
    }
}

/**
 * SubAgent (🎖️ Soldado Silencioso)
 * Executa tarefas conectando-se ao MCP Server para usar ferramentas.
 */
class SubAgent {
    private _mcpClient: Client | null = null;
    private _history: ChatMessage[] = [];

    constructor(
        public readonly id: string,
        public readonly role: string,
        private readonly _llm: LlmClient
    ) {
        this._history.push({
            role: 'system',
            content: `Você é um subagente especialista no papel de ${role}. 
Sua tarefa é executar a missão designada pelo General Orquestrador de forma silenciosa e eficiente.
Você tem acesso ao Servidor MCP do cngsmOS para usar ferramentas.`
        });
    }

    public async runTask(task: string): Promise<void> {
        // 1. Conectar ao MCP Server (SSE)
        const transport = new SSEClientTransport(new URL("http://localhost:3001/sse"));
        this._mcpClient = new Client(
            { name: `SubAgent-${this.id}`, version: "1.0.0" },
            { capabilities: {} }
        );

        await this._mcpClient.connect(transport);
        console.log(`[CNGSM] SubAgent ${this.id} connected to MCP Server.`);

        // 2. Loop de Raciocínio (Simplificado para esta etapa)
        this._history.push({ role: 'user', content: task });
        
        // Em um cenário real, aqui rodaria um loop de "read-act-reason" 
        // similar ao loop principal, mas enviando saídas apenas para o log/blackboard.
        // Como o prompt pede "Silent Replies", não postamos no HUD do usuário.
        
        await new Promise((resolve, reject) => {
            this._llm.streamChat(
                this._history,
                (token) => {
                    // Silent: Apenas log interno
                    // console.log(`[SubAgent ${this.id}] ${token}`);
                },
                (err) => reject(err)
            ).then(() => resolve(null));
        });

        // 3. Cleanup
        await transport.close();
    }
}
