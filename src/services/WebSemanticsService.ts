import CDP from 'chrome-remote-interface';

export interface SemanticNode {
    id: string;
    role: string;
    name: string;
    description?: string;
}

export class WebSemanticsService {
    private _client: any;
    constructor(private readonly _port: number = 9222) {}

    private async _getClient() {
        if (this._client) return this._client;
        try {
            this._client = await CDP({ port: this._port });
            const { Accessibility, Runtime, Page, DOM } = this._client;
            await Promise.all([
                Accessibility.enable(),
                Runtime.enable(),
                Page.enable(),
                DOM.enable()
            ]);
            return this._client;
        } catch (e) {
            this._client = null;
            throw new Error(`Falha ao conectar CDP porta ${this._port}: ${e}`);
        }
    }

    public async scanPageSemantics(): Promise<SemanticNode[]> {
        const client = await this._getClient();
        const { nodes } = await client.Accessibility.getFullAXTree();
        return nodes
            .filter((node: any) => {
                const role = node.role?.value;
                return ['button', 'link', 'textbox', 'checkbox', 'combobox', 'searchbox'].includes(role) && node.name?.value;
            })
            .map((node: any) => ({
                id: node.nodeId,
                role: node.role?.value,
                name: node.name?.value,
                description: node.description?.value
            }));
    }

    public async clickNode(nodeId: string): Promise<void> {
        const client = await this._getClient();
        await client.Runtime.evaluate({
            expression: `document.activeElement.click();` // Placeholder robusto
        });
    }

    public async typeNode(nodeId: string, text: string): Promise<void> {
        const client = await this._getClient();
        const { Input } = client;
        for (const char of text) {
            await Input.dispatchKeyEvent({ type: 'keyDown', text: char });
            await Input.dispatchKeyEvent({ type: 'keyUp', text: char });
        }
    }

    public async close() {
        if (this._client) {
            await this._client.close();
            this._client = null;
        }
    }
}
