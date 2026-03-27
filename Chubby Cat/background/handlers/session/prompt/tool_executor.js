// background/handlers/session/prompt/tool_executor.js
import { parseToolCommand } from '../utils.js';

export class ToolExecutor {
    constructor(mcpManager) {
        this.mcpManager = mcpManager;
    }

    async executeIfPresent(text, request, onUpdate) {
        const toolCommand = parseToolCommand(text);
        if (!toolCommand) return null;

        const toolName = toolCommand.name;
        onUpdate(`Executing tool: ${toolName}...`, "Processing tool execution...");

        let output = "";
        let files = null;
        let source = "mcp_remote";

        try {
            if (!this.mcpManager || !this.mcpManager.isEnabled(request)) {
                throw new Error(`Unknown tool '${toolName}'. (External MCP tools are disabled)`);
            }

            if (request && request.mcpToolMode === 'selected') {
                const enabled = Array.isArray(request.mcpEnabledTools) ? request.mcpEnabledTools : [];
                const enabledSet = new Set(enabled);
                if (!enabledSet.has(toolName)) {
                    throw new Error(`External MCP tool '${toolName}' is disabled (not in selected tools).`);
                }
            }

            // Use callToolMulti for multi-server support - it finds the right server automatically
            const remote = await this.mcpManager.callToolMulti(request, toolName, toolCommand.args || {});
            output = remote.text;
            files = remote.files && remote.files.length ? remote.files : null;
        } catch (err) {
            output = `Error executing tool: ${err.message}`;
        }

        return {
            toolName,
            output,
            files,
            source
        };
    }
}
