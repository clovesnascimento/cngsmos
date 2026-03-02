import * as vscode from 'vscode';

export class TelegramService {
    private _token: string | undefined;
    private _chatId: string | undefined;

    constructor() {
        this._loadConfig();
    }

    private _loadConfig() {
        const config = vscode.workspace.getConfiguration('cngsm');
        this._token = config.get<string>('telegramToken');
        this._chatId = config.get<string>('telegramChatId');
    }

    public async sendMessage(text: string): Promise<void> {
        this._loadConfig(); // Refresh config

        if (!this._token || !this._chatId) {
            throw new Error('Telegram Bot Token ou Chat ID não configurados no Arsenal Vault.');
        }

        const url = `https://api.telegram.org/bot${this._token}/sendMessage`;
        const body = {
            chat_id: this._chatId,
            text: text,
            parse_mode: 'Markdown'
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s tactical timeout

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(`Erro API Telegram: ${errorData.description || response.statusText}`);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('TIMEOUT: O sinal do Telegram falhou em 5s. Verifique sua conexão.');
            }
            throw new Error(`FALHA DE REDE: O sinal do Telegram não pôde ser enviado (${error.message}).`);
        } finally {
            clearTimeout(timeout);
        }
    }
}
