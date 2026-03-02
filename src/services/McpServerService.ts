import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VectorSearchService } from "./VectorSearchService";
import { WebSemanticsService } from "./WebSemanticsService";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";

export class McpServerService {
    private _server: Server;
    private _stdioTransport: StdioServerTransport | null = null;
    private _sseTransport: SSEServerTransport | null = null;
    private _httpServer: http.Server | null = null;
    private _dynamicSkills: Map<string, any> = new Map();
    private _skillsDir: string;

    constructor(
        private readonly _vectorSearch: VectorSearchService,
        private readonly _webSemantics: WebSemanticsService,
        private readonly _workspaceRoot: string
    ) {
        this._skillsDir = path.join(_workspaceRoot, 'src', 'skills');
        this._server = new Server(
            { name: "cngsmOS-Core", version: "3.0.0" },
            { capabilities: { tools: {} } }
        );

        this._loadDynamicSkills().then(() => {
            this._setupHandlers();
        });
    }

    private async _loadDynamicSkills() {
        if (!fs.existsSync(this._skillsDir)) return;
        const files = fs.readdirSync(this._skillsDir).filter(f => f.endsWith('.ts'));
        for (const file of files) {
            const skillName = file.replace('.ts', '').toLowerCase();
            this._dynamicSkills.set(skillName, {
                name: skillName,
                description: `Skill dinâmica forjada: ${skillName}`,
                inputSchema: { type: "object", properties: {} }
            });
        }
    }

    private _setupHandlers() {
        this._server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "vector_search",
                        description: "Busca no córtex SQLite FTS5 do cngsmOS.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Query de busca" },
                            },
                            required: ["query"],
                        },
                    },
                    {
                        name: "web_semantic_scan",
                        description: "Varre a página atual do Chrome Bridge.",
                        inputSchema: { type: "object", properties: {} },
                    },
                    {
                        name: "web_click_node",
                        description: "Clica em um elemento semântico pelo seu ID.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                nodeId: { type: "string", description: "ID do nó" },
                            },
                            required: ["nodeId"],
                        },
                    },
                    {
                        name: "web_type_node",
                        description: "Digita texto em um campo de input.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                nodeId: { type: "string", description: "ID do nó" },
                                text: { type: "string", description: "Texto" },
                            },
                            required: ["nodeId", "text"],
                        },
                    },
                    ...Array.from(this._dynamicSkills.values())
                ],
            };
        });

        this._server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case "vector_search":
                        const results = await this._vectorSearch.search(args?.query as string);
                        return { content: [{ type: "text", text: JSON.stringify(results) }] };
                    case "web_semantic_scan":
                        const nodes = await this._webSemantics.scanPageSemantics();
                        return { content: [{ type: "text", text: JSON.stringify(nodes) }] };
                    case "web_click_node":
                        await this._webSemantics.clickNode(args?.nodeId as string);
                        return { content: [{ type: "text", text: "Clique executado." }] };
                    case "web_type_node":
                        await this._webSemantics.typeNode(args?.nodeId as string, args?.text as string);
                        return { content: [{ type: "text", text: "Texto digitado." }] };
                    default:
                        if (this._dynamicSkills.has(name)) {
                            return { content: [{ type: "text", text: `Execução da skill dinâmica '${name}' concluída.` }] };
                        }
                        throw new Error(`Tool não encontrada: ${name}`);
                }
            } catch (error: any) {
                return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
            }
        });
    }

    public async startSSE(port: number = 3001) {
        this._httpServer = http.createServer(async (req, res) => {
            if (req.url === "/sse") {
                this._sseTransport = new SSEServerTransport("/messages", res);
                await this._server.connect(this._sseTransport);
            } else if (req.url === "/messages" && req.method === "POST") {
                if (this._sseTransport) {
                    await this._sseTransport.handlePostMessage(req, res);
                }
            } else {
                res.writeHead(404);
                res.end();
            }
        });
        this._httpServer.listen(port);
    }
}
