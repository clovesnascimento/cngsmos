import { LlmClient } from "../services/LlmClient";

export class WebSearchTool {
    constructor(private _llmClient: LlmClient) {}

    public async search(query: string): Promise<string> {
        const config = (this._llmClient as any).config; // Accessing private config for ease in this simple implementation
        const apiKey = config.tavilyApiKey;

        if (!apiKey) {
            throw new Error("Tavily API Key is missing in settings.");
        }

        try {
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "basic",
                    include_answer: true,
                    max_results: 5
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Tavily API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json() as any;
            
            let resultText = `Web Search Results for: "${query}"\n\n`;
            
            if (data.answer) {
                resultText += `Summary: ${data.answer}\n\n`;
            }

            if (data.results && data.results.length > 0) {
                resultText += `Top Results:\n`;
                data.results.forEach((res: any, index: number) => {
                    resultText += `${index + 1}. [${res.title}](${res.url})\n   ${res.content}\n\n`;
                });
            } else {
                resultText += "No detailed results found.";
            }

            return resultText;

        } catch (error: any) {
            throw new Error(`Search Failed: ${error.message}`);
        }
    }
}
