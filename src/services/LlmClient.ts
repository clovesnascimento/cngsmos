import * as vscode from 'vscode';

export interface LlmConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    systemPrompt: string;
    tavilyApiKey: string;
}

export type TokenCallback = (token: string) => void;
export type ErrorCallback = (error: string) => void;

export interface ChatMessage {
    role: string;
    content: string;
}

export class LlmClient {
    private config: LlmConfig;

    constructor() {
        this.config = this.loadConfig();
    }

    public refreshConfig(modelOverride?: string) {
        this.config = this.loadConfig(modelOverride);
    }

    private loadConfig(modelOverride?: string): LlmConfig {
        const config = vscode.workspace.getConfiguration('cngsm');
        return {
            apiKey: config.get<string>('apiKey') || '',
            baseUrl: config.get<string>('baseUrl') || 'http://localhost:11434/v1',
            model: modelOverride || config.get<string>('model') || 'deepseek-r1',
            systemPrompt: config.get<string>('systemPrompt') || 'You are CNGSM Code Agent, an expert coding assistant.',
            tavilyApiKey: config.get<string>('tavilyApiKey') || ''
        };
    }

    public getSystemPrompt(): string {
        return this.config.systemPrompt;
    }

    public async streamChat(
        messages: ChatMessage[],
        onToken: TokenCallback,
        onError: ErrorCallback
    ): Promise<void> {

        // Validate config
        if (!this.config.baseUrl) {
            onError('Configuration Error: Base URL is missing.');
            return;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
                    stream: true
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errMsg = `API Error ${response.status}: ${errorText}`;
                if (response.status === 400 && errorText.includes('Model Not Exist')) {
                    errMsg = `🚨 MODELO NÃO ENCONTRADO: O provedor rejeitou o nome "${this.config.model}". Verifique se o modelo está baixado (ollama run ${this.config.model}).`;
                }
                onError(errMsg);
                return;
            }

            if (!response.body) {
                onError('API Error: No response body.');
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last partial line in the buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

                    if (trimmedLine.startsWith('data: ')) {
                        const jsonStr = trimmedLine.replace('data: ', '');
                        try {
                            const json = JSON.parse(jsonStr);
                            const content = json.choices?.[0]?.delta?.content;
                            if (content) {
                                onToken(content);
                            }
                        } catch (e) {
                            console.error('Error parsing JSON chunk:', e);
                        }
                    }
                }
            }

        } catch (error: any) {
            onError(`Network Error: ${error.message}`);
        }
    }
}
