
// lib/constants.js

export const DEFAULT_SHORTCUTS = {
    quickAsk: "Ctrl+G",
    openPanel: "Alt+S",
    browserControl: "Ctrl+B"
};

export const DEFAULT_QUICK_PHRASES = [
    "请总结这个网页内容。",
    "请识别并提取这张图片中的文字 (OCR)。仅输出识别到的文本内容，不需要任何解释。"
];

export const DEFAULT_MCP_SERVERS = [
    {
        name: "Local Proxy",
        transport: "sse",
        url: "http://127.0.0.1:3006/sse",
        enabled: true,
        toolMode: "all",
        enabledTools: []
    },
    {
        name: "EXA搜索",
        transport: "streamable-http",
        url: "https://mcp.exa.ai/mcp",
        enabled: true,
        toolMode: "all",
        enabledTools: []
    }
];

export const DEFAULT_MODEL = "gemini-3-flash";

export const TOOL_OUTPUT_MARKER = '**Tool Output:**';
export const TOOL_OUTPUT_PREFIX = `\uD83D\uDEE0\uFE0F ${TOOL_OUTPUT_MARKER}`;
