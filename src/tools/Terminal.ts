import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export class TerminalTool {

    /**
     * Executes a command in the workspace root and returns output.
     * @param command The shell command to execute.
     * @param timeout Timeout in milliseconds (default 30s).
     */
    public async executeCommand(command: string, timeout: number = 30000): Promise<string> {
        const workspacePath = this.getWorkspacePath();

        return new Promise((resolve, reject) => {
            cp.exec(command, { cwd: workspacePath, timeout: timeout }, (error, stdout, stderr) => {
                if (error) {
                    if (error.killed) {
                        resolve(`Command timed out after ${timeout / 1000}s.`);
                        return;
                    }
                    // Command failed (non-zero exit code)
                    resolve(`Command failed with exit code ${error.code}:\n${stderr || stdout}`);
                    return;
                }
                // Command succeeded
                const output = stdout || stderr || '(No output)';
                resolve(output.trim());
            });
        });
    }

    private getWorkspacePath(): string {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
           throw new Error('No workspace folder open.');
        }
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
}
