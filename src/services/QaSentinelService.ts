import * as net from 'net';
import { BackgroundTaskManager } from './BackgroundTaskManager';
import { OrchestratorService } from './OrchestratorService';

/**
 * QaSentinelService (🛡️ Sentinela QA v1.0)
 * Orquestra testes E2E autônomos.
 */
export class QaSentinelService {
    constructor(
        private readonly _backgroundManager: BackgroundTaskManager,
        private readonly _orchestrator: OrchestratorService,
        private readonly _onUpdate: (status: string) => void
    ) {}

    /**
     * Inicia a Operação Sentinela: Sobe servidor -> Testa -> Cleanup.
     */
    public async runSentinel(command: string, port: number, url: string, targetTask: string): Promise<void> {
        this._onUpdate('SENTINELA QA: INICIANDO SERVIDOR 🛡️');
        
        const pid = this._backgroundManager.runInBackground(command, process.cwd());
        
        try {
            this._onUpdate(`SENTINELA QA: AGUARDANDO PORTA ${port}...`);
            await this._waitForPort(port);
            
            this._onUpdate('SENTINELA QA: MOBILIZANDO AGENTE QA 🪖');
            const qaTask = `Acesse ${url} e execute os seguintes testes: ${targetTask}. 
Use web_semantic_scan para ver os elementos e clique/digite conforme necessário para validar o fluxo. 
Reporte 'BUILD_SUCCESS' se tudo passar ou 'BUILD_FAILURE' com detalhes do erro.`;
            
            await this._orchestrator.spawnSubAgent('QA', qaTask);
            
        } catch (e: any) {
            console.error(`[CNGSM] Sentinela QA falhou: ${e.message}`);
            this._onUpdate(`SENTINELA QA: ERRO - ${e.message} ❌`);
        }
    }

    private _waitForPort(port: number, timeout: number = 30000): Promise<void> {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                const socket = new net.Socket();
                socket.setTimeout(1000);
                socket.connect(port, '127.0.0.1', () => {
                    socket.destroy();
                    resolve();
                });
                socket.on('error', () => {
                    socket.destroy();
                    if (Date.now() - start > timeout) {
                        reject(new Error(`Timeout aguardando porta ${port}`));
                    } else {
                        setTimeout(check, 1000);
                    }
                });
            };
            check();
        });
    }
}
