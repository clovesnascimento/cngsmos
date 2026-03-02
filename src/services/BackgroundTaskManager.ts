import * as cp from 'child_process';
import * as vscode from 'vscode';

export interface ActiveProcess {
    pid: number;
    command: string;
    startTime: number;
    logs: string[];
}

/**
 * BackgroundTaskManager (PTY Light v1.1)
 * Gerencia processos em segundo plano para o cngsmOS com Fator de Cura.
 */
export class BackgroundTaskManager {
    private _processes: Map<number, cp.ChildProcess> = new Map();
    private _metadata: Map<number, ActiveProcess> = new Map();
    public onCrash?: (pid: number, command: string, lastLogs: string[]) => void;

    constructor(
        private readonly _onUpdate: (processes: ActiveProcess[]) => void
    ) {}

    /**
     * Spawna um processo em background sem travar o loop principal.
     */
    public runInBackground(command: string, cwd: string): number {
        const process = cp.spawn(command, {
            cwd: cwd,
            shell: true,
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        if (!process.pid) {
            throw new Error('Falha ao obter PID do processo.');
        }

        const metadata: ActiveProcess = {
            pid: process.pid,
            command: command,
            startTime: Date.now(),
            logs: []
        };

        this._processes.set(process.pid, process);
        this._metadata.set(process.pid, metadata);

        // Monitorar stderr para logs de erro
        process.stderr?.on('data', (data) => {
            const lines = data.toString().split('\n');
            metadata.logs.push(...lines);
            if (metadata.logs.length > 50) metadata.logs.shift(); // Manter últimas 50
        });

        process.on('exit', (code) => {
            console.log(`[CNGSM] Process ${process.pid} exited with code ${code}`);
            
            // Se o processo crashou (exit != 0), avisar orquestrador
            if (code !== 0 && code !== null) {
                this.onCrash?.(process.pid!, command, metadata.logs);
            }

            this.killProcess(process.pid!); // Cleanup metadata
        });

        process.unref();
        this._notifyUpdate();

        return process.pid;
    }

    /**
     * Encerra um processo ativo.
     */
    public killProcess(pid: number): boolean {
        const child = this._processes.get(pid);
        if (child) {
            try {
                // Windows fix for killing process tree
                if (process.platform === 'win32') {
                    cp.exec(`taskkill /pid ${pid} /f /t`);
                } else {
                    child.kill();
                }
            } catch (e) {
                console.error(`Error killing process ${pid}:`, e);
            }
            this._processes.delete(pid);
            this._metadata.delete(pid);
            this._notifyUpdate();
            return true;
        }
        return false;
    }

    public getActiveProcesses(): ActiveProcess[] {
        return Array.from(this._metadata.values());
    }

    private _notifyUpdate() {
        this._onUpdate(this.getActiveProcesses());
    }
}
