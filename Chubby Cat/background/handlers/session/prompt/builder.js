
// background/handlers/session/prompt/builder.js
import { getActiveTabContent } from '../utils.js';

export class PromptBuilder {
    constructor(mcpManager) {
        this.mcpManager = mcpManager;
    }

    async build(request) {
        let systemPreamble = "";

        // Handle multi-tab context (from tab selector dropdown)
        if (request.includeMultiTabContext) {
            try {
                const stored = await chrome.storage.session.get(['multiTabContext', 'multiTabCount']);
                if (stored.multiTabContext && stored.multiTabCount > 0) {
                    systemPreamble += `Webpage Context (${stored.multiTabCount} tabs):\n\`\`\`text\n${stored.multiTabContext}\n\`\`\`\n\n`;
                    // Note: We intentionally do NOT clear multiTabContext here.
                    // The content should persist throughout the conversation until
                    // the user explicitly deselects tabs (which triggers CLEAR_MULTI_TAB_CONTEXT).
                }
            } catch (e) {
                console.warn("Failed to get multi-tab context:", e);
            }
        }

        // Handle single page context (from "网页" button) - independent of multi-tab
        if (request.includePageContext) {
            const pageContent = await getActiveTabContent();

            if (pageContent) {
                systemPreamble += `Webpage Context:\n\`\`\`text\n${pageContent}\n\`\`\`\n\n`;
            }
        }

        // --- External MCP Tools (Remote Servers) ---
        // Only inject when enabled in request (passed from UI settings).
        if (request.enableMcpTools) {
            systemPreamble += `[System: Tooling Enabled]\n`;
            systemPreamble += `You may call tools when helpful.\n\n`;
            systemPreamble += `**Output Format:**\n`;
            systemPreamble += `To use a tool, output a **single** JSON block at the end of your response:\n`;
            systemPreamble += `\`\`\`json\n{ "tool": "tool_name", "args": { ... } }\n\`\`\`\n\n`;

            if (this.mcpManager) {
                try {
                    systemPreamble += await this.mcpManager.buildToolsPreamble(request);
                } catch (e) {
                    systemPreamble += `[External MCP Tools Error]: ${e.message}\n\n`;
                }
            } else {
                systemPreamble += `[External MCP Tools Error]: MCP manager not available.\n\n`;
            }
        }

        // Return separated components
        return {
            systemInstruction: systemPreamble,
            userPrompt: request.text
        };
    }

}
