import * as vscode from 'vscode';
import { CngsmPanelProvider } from './CngsmPanelProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log("AGENTE ATIVADO");
	console.log('CNGSM Code Agent is now active!');

	const provider = new CngsmPanelProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CngsmPanelProvider.viewType, provider)
	);

	let disposable = vscode.commands.registerCommand('cngsm-code-agent.helloWorld', () => {
		vscode.window.showInformationMessage('Hello from CNGSM Code Agent!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
