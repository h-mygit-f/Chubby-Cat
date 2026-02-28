
// sandbox/ui/templates/settings/mcp.js
// MCP Configuration Template - extracted from connection.js

export const McpSettingsTemplate = `
<div class="setting-group">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px;">
        <div>
            <label data-i18n="mcpTools" style="font-weight: 500; display: block; margin-bottom: 2px;">外部 MCP 工具</label>
            <div data-i18n="mcpToolsDesc" style="font-size: 12px; opacity: 0.85;">连接本地/远程 MCP 服务器并在聊天中使用其工具。</div>
        </div>
        <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="mcp-enabled" />
            <span data-i18n="enabled">已启用</span>
        </label>
    </div>

    <div id="mcp-fields" style="display: none; flex-direction: column; gap: 12px;">
        <div>
            <label data-i18n="mcpActiveServers" style="font-weight: 500; display: block; margin-bottom: 6px;">活跃服务器</label>
            <div data-i18n="mcpMultiServerHint" style="font-size: 11px; opacity: 0.75; margin-bottom: 8px;">勾选多个服务器可同时使用。</div>
            <div id="mcp-server-list" style="max-height: 150px; overflow: auto; padding: 8px; background: rgba(255,255,255,0.55); border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 6px;"></div>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
                <button id="mcp-add-server" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="mcpAddServer">添加</button>
                <button id="mcp-remove-server" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="mcpRemoveServer">删除</button>
            </div>
        </div>

        <div>
            <label data-i18n="mcpServerName" style="font-weight: 500; display: block; margin-bottom: 2px;">名称</label>
            <input type="text" id="mcp-server-name" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="Local Proxy">
        </div>
        <div>
            <label data-i18n="mcpTransport" style="font-weight: 500; display: block; margin-bottom: 2px;">传输协议</label>
            <select id="mcp-transport" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
                <option value="sse">SSE (http://.../sse)</option>
                <option value="streamable-http">Streamable HTTP (http://.../mcp)</option>
                <option value="ws">WebSocket (ws://)</option>
            </select>
        </div>
        <div>
            <label data-i18n="mcpServerUrl" style="font-weight: 500; display: block; margin-bottom: 2px;">服务器 URL</label>
            <input type="text" id="mcp-server-url" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="http://127.0.0.1:3006/sse">
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="mcp-server-enabled" />
                <span data-i18n="enabled">已启用</span>
            </label>
            <button id="mcp-test-connection" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="mcpTestConnection">测试</button>
        </div>
        <div id="mcp-test-status" style="font-size: 12px; opacity: 0.85;"></div>

        <div style="margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 10px;">
            <div>
                <label data-i18n="mcpToolMode" style="font-weight: 500; display: block; margin-bottom: 6px;">开放工具</label>
                <select id="mcp-tool-mode" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
                    <option value="all" data-i18n="mcpToolModeAll">全部工具（默认）</option>
                    <option value="selected" data-i18n="mcpToolModeSelected">仅选定工具</option>
                </select>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
                <button id="mcp-refresh-tools" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="mcpRefreshTools">刷新工具</button>
                <button id="mcp-enable-all-tools" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="mcpEnableAllTools">全部启用</button>
                <button id="mcp-disable-all-tools" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="mcpDisableAllTools">全部禁用</button>
            </div>

            <input type="text" id="mcp-tool-search" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="mcpToolSearchPlaceholder" placeholder="Search tools...">

            <div id="mcp-tools-summary" style="font-size: 12px; opacity: 0.85;"></div>

            <div id="mcp-tool-list" style="max-height: 220px; overflow: auto; padding: 8px; background: rgba(255,255,255,0.55); border-radius: 8px; border: 1px solid rgba(0,0,0,0.06);"></div>
        </div>
    </div>
</div>`;
