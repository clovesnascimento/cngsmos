import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';

export class FileSystemTool {
    
    /**
     * Reads the content of a file from the workspace.
     * @param relativePath Relative path from the workspace root (e.g., 'src/extension.ts').
     */
    public async readFile(relativePath: string): Promise<string> {
        const uri = this.getUri(relativePath);
        try {
            const uint8Array = await vscode.workspace.fs.readFile(uri);
            return new TextDecoder().decode(uint8Array);
        } catch (error: any) {
            throw new Error(`Failed to read file '${relativePath}': ${error.message}`);
        }
    }

    /**
     * Writes content to a file in the workspace. Creates the file if it doesn't exist.
     * @param relativePath Relative path from the workspace root.
     * @param content The string content to write.
     */
    public async writeFile(relativePath: string, content: string): Promise<void> {
        const uri = this.getUri(relativePath);
        try {
            const uint8Array = new TextEncoder().encode(content);
            await vscode.workspace.fs.writeFile(uri, uint8Array);
        } catch (error: any) {
             throw new Error(`Failed to write file '${relativePath}': ${error.message}`);
        }
    }

    /**
     * Lists files in a directory.
     * @param relativePath Relative path to the directory.
     */
    public async listDir(relativePath: string): Promise<string[]> {
        const uri = this.getUri(relativePath);
        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);
            // Format: [name, type] - we just return names for simplicity now, or formatted string
            return entries.map(([name, type]) => {
                const typeStr = type === vscode.FileType.Directory ? 'DIR' : 'FILE';
                return `[${typeStr}] ${name}`;
            });
        } catch (error: any) {
            throw new Error(`Failed to list directory '${relativePath}': ${error.message}`);
        }
    }

    private getUri(relativePath: string): vscode.Uri {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            throw new Error('No workspace folder open.');
        }
        // Default to the first workspace folder
        const baseUri = vscode.workspace.workspaceFolders[0].uri;
        return vscode.Uri.joinPath(baseUri, relativePath);
    }
}
