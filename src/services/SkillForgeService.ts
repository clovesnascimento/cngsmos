import * as fs from 'fs';
import * as path from 'path';
import { SecurityScanner } from './SecurityScanner';
import { LlmClient } from './LlmClient';

/**
 * SkillForgeService (🛠️ A Forja v3.0)
 * Permite a geração dinâmica de novas ferramentas para o cngsmOS.
 */
export class SkillForgeService {
    private _skillsDir: string;

    constructor(private readonly _workspaceRoot: string) {
        this._skillsDir = path.join(_workspaceRoot, 'src', 'skills');
        if (!fs.existsSync(this._skillsDir)) {
            fs.mkdirSync(this._skillsDir, { recursive: true });
        }
    }

    /**
     * Forja uma nova ferramenta baseada em uma intenção e requisitos.
     */
    public async forgeTool(name: string, intent: string, requirements: string): Promise<{ success: boolean; message: string }> {
        const fileName = `${name}.ts`;
        const docName = `${name}.md`;
        const skillPath = path.join(this._skillsDir, fileName);
        const docPath = path.join(this._skillsDir, docName);

        // 1. Geração de Código (Template MCP Tool)
        const codePrompt = `Gere uma ferramenta MCP (Model Context Protocol) em TypeScript para o cngsmOS.
Nome da Skill: ${name}
Intenção: ${intent}
Requisitos: ${requirements}

Regras:
1. Use apenas bibliotecas seguras (fs/promises, path, axios, zod).
2. O código deve exportar um objeto 'toolDefinition' e uma função 'handler'.
3. Retorne APENAS o código TypeScript puro, sem blocos de markdown.`;

        // Aqui simularíamos uma chamada ao LLM para gerar o código.
        // Como sou o Antigravity, eu mesmo posso gerar o código se for instruído, 
        // mas o serviço deve ser autônomo.
        const generatedCode = `
import { z } from "zod";

export const toolDefinition = {
    name: "${name.toLowerCase()}",
    description: "${intent}",
    inputSchema: {
        type: "object",
        properties: {
            // Adicione as propriedades baseadas nos requisitos: ${requirements}
        },
        required: [],
    },
};

export const handler = async (args: any) => {
    // Implementação da skill forjada para: ${intent}
    return {
        content: [{ type: "text", text: "Skill ${name} executada com sucesso (Placeholder Forjado)." }],
    };
};
`;

        // 2. Auditoria de Segurança
        const audit = SecurityScanner.auditForgedSkill(generatedCode);
        if (!audit.isValid) {
            return { success: false, message: `Forja abortada pelo Iron Shell: ${audit.reason}` };
        }

        // 3. Salvar Arquivos
        try {
            fs.writeFileSync(skillPath, generatedCode);
            
            const docContent = `# 🛠️ SKILL: ${name}
## Intenção
${intent}
## Requisitos
${requirements}
## Como usar
Chame a tool \`${name.toLowerCase()}\` via MCP.
`;
            fs.writeFileSync(docPath, docContent);

            return { success: true, message: `Skill ${name} forjada e documentada em ${fileName}.` };
        } catch (e: any) {
            return { success: false, message: `Erro ao gravar skill: ${e.message}` };
        }
    }

    public getGeneratedSkillsCount(): number {
        if (!fs.existsSync(this._skillsDir)) return 0;
        return fs.readdirSync(this._skillsDir).filter(f => f.endsWith('.ts')).length;
    }
}
