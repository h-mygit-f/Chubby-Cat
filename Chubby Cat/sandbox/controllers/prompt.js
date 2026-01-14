
// sandbox/controllers/prompt.js
import { appendMessage } from '../render/message.js';
import { sendToBackground, saveSessionsToStorage } from '../../lib/messaging.js';
import { t } from '../core/i18n.js';

export class PromptController {
    constructor(sessionManager, uiController, imageManager, appController) {
        this.sessionManager = sessionManager;
        this.ui = uiController;
        this.imageManager = imageManager;
        this.app = appController;
        this.cancellationTimestamp = 0;
    }

    async send() {
        if (this.app.isGenerating) return;

        const text = this.ui.inputFn.value.trim();
        const files = this.imageManager.getFiles();

        if (!text && files.length === 0) return;

        if (!this.sessionManager.currentSessionId) {
            this.sessionManager.createSession();
        }

        const currentId = this.sessionManager.currentSessionId;
        const session = this.sessionManager.getCurrentSession();

        // Update Title if needed
        if (session.messages.length === 0) {
            const titleUpdate = this.sessionManager.updateTitle(currentId, text || t('imageSent'));
            if (titleUpdate) this.app.sessionFlow.refreshHistoryUI();
        }

        // Render User Message
        const displayAttachments = files.map(f => f.base64);

        appendMessage(
            this.ui.historyDiv,
            text,
            'user',
            displayAttachments.length > 0 ? displayAttachments : null
        );

        this.sessionManager.addMessage(currentId, 'user', text, displayAttachments.length > 0 ? displayAttachments : null);

        saveSessionsToStorage(this.sessionManager.sessions);
        this.app.sessionFlow.refreshHistoryUI();

        // Prepare Context & Model
        const selectedModel = this.app.getSelectedModel();

        if (session.context) {
            sendToBackground({
                action: "SET_CONTEXT",
                context: session.context,
                model: selectedModel
            });
        }

        this.ui.resetInput();
        this.imageManager.clearFile();

        // Disable all regenerate buttons during generation
        if (this.app.messageHandler && this.app.messageHandler.disableAllRegenerateButtons) {
            this.app.messageHandler.disableAllRegenerateButtons();
        }

        this.app.isGenerating = true;
        this.ui.setLoading(true);

        const conn = (this.ui && this.ui.settings && this.ui.settings.connectionData) ? this.ui.settings.connectionData : {};

        // Multi-select MCP servers support
        let activeMcpServers = [];
        if (conn && Array.isArray(conn.mcpServers) && conn.mcpServers.length > 0) {
            // Get active server IDs (multi-select array or fallback to single)
            const activeIds = Array.isArray(conn.mcpActiveServerIds) && conn.mcpActiveServerIds.length > 0
                ? new Set(conn.mcpActiveServerIds)
                : (conn.mcpActiveServerId ? new Set([conn.mcpActiveServerId]) : new Set());

            // Filter to only enabled servers with valid URLs that are in activeIds
            activeMcpServers = conn.mcpServers.filter(s =>
                s &&
                activeIds.has(s.id) &&
                s.enabled !== false &&
                s.url &&
                s.url.trim()
            );
        } else if (conn && (conn.mcpServerUrl || conn.mcpTransport)) {
            // Legacy single server support
            activeMcpServers = [{
                id: null,
                name: '',
                transport: conn.mcpTransport || 'sse',
                url: conn.mcpServerUrl || '',
                enabled: true,
                toolMode: 'all',
                enabledTools: []
            }];
        }

        const enableMcpTools = conn.mcpEnabled === true && activeMcpServers.length > 0;

        sendToBackground({
            action: "SEND_PROMPT",
            text: text,
            files: files, // Send full file objects array
            model: selectedModel,
            includePageContext: this.app.pageContextActive,
            includeMultiTabContext: this.app.multiTabContextActive, // Separate flag for multi-tab
            enableBrowserControl: this.app.browserControlActive, // Pass browser control state
            enableMcpTools: enableMcpTools,
            // Multi-select MCP servers array
            mcpServers: activeMcpServers,
            // Legacy single server fields (from first active server for backward compat)
            mcpTransport: activeMcpServers.length > 0 ? (activeMcpServers[0].transport || "sse") : "sse",
            mcpServerUrl: activeMcpServers.length > 0 ? (activeMcpServers[0].url || "") : "",
            mcpServerId: activeMcpServers.length > 0 ? activeMcpServers[0].id : null,
            mcpToolMode: activeMcpServers.length > 0 && activeMcpServers[0].toolMode ? activeMcpServers[0].toolMode : 'all',
            mcpEnabledTools: activeMcpServers.length > 0 && Array.isArray(activeMcpServers[0].enabledTools) ? activeMcpServers[0].enabledTools : [],
            sessionId: currentId // Important: Pass session ID so background can save history independently
        });
    }

    cancel() {
        if (!this.app.isGenerating) return;

        this.cancellationTimestamp = Date.now();

        sendToBackground({ action: "CANCEL_PROMPT" });
        this.app.messageHandler.resetStream();

        this.app.isGenerating = false;
        this.ui.setLoading(false);
        this.ui.updateStatus(t('cancelled'));

        // Re-enable all regenerate buttons after cancellation
        if (this.app.messageHandler && this.app.messageHandler.enableAllRegenerateButtons) {
            this.app.messageHandler.enableAllRegenerateButtons();
        }
    }

    isCancellationRecent() {
        return (Date.now() - this.cancellationTimestamp) < 2000; // 2s window
    }

    /**
     * Regenerate the last AI response
     * This will:
     * 1. Cancel any ongoing generation
     * 2. Remove the last AI message from the session
     * 3. Resend the last user message to get a new AI response
     */
    async regenerate() {
        // Don't allow regeneration if already generating
        if (this.app.isGenerating) {
            this.cancel();
            // Wait a bit for cancellation to take effect
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const currentId = this.sessionManager.currentSessionId;
        const session = this.sessionManager.getCurrentSession();

        if (!session || session.messages.length < 2) {
            // Need at least one user message and one AI message
            return;
        }

        // Find the last AI message and its preceding user message
        const messages = session.messages;
        let lastAiIndex = -1;
        let lastUserMessage = null;
        let lastUserAttachment = null;

        // Find the last AI message
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'ai') {
                lastAiIndex = i;
                break;
            }
        }

        if (lastAiIndex === -1) {
            return; // No AI message to regenerate
        }

        // Find the user message before the AI message
        for (let i = lastAiIndex - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMessage = messages[i];
                lastUserAttachment = messages[i].image || null;
                break;
            }
        }

        if (!lastUserMessage) {
            return; // No user message found
        }

        // Remove the last AI message from the UI
        const chatHistory = this.ui.historyDiv;
        const aiMessages = chatHistory.querySelectorAll('.msg.ai');
        if (aiMessages.length > 0) {
            const lastAiDiv = aiMessages[aiMessages.length - 1];
            lastAiDiv.remove();
        }

        // Remove the last AI message from session
        session.messages.splice(lastAiIndex, 1);
        saveSessionsToStorage(this.sessionManager.sessions);

        // Update status
        this.ui.updateStatus(t('regenerating'));

        // Disable all regenerate buttons to prevent multiple concurrent regenerations
        if (this.app.messageHandler && this.app.messageHandler.disableAllRegenerateButtons) {
            this.app.messageHandler.disableAllRegenerateButtons();
        }

        // Prepare to resend
        this.app.isGenerating = true;
        this.ui.setLoading(true);

        const selectedModel = this.app.getSelectedModel();

        // Restore context if needed
        if (session.context) {
            sendToBackground({
                action: "SET_CONTEXT",
                context: session.context,
                model: selectedModel
            });
        }

        const conn = (this.ui && this.ui.settings && this.ui.settings.connectionData) ? this.ui.settings.connectionData : {};

        // Multi-select MCP servers support (same logic as send())
        let activeMcpServers = [];
        if (conn && Array.isArray(conn.mcpServers) && conn.mcpServers.length > 0) {
            const activeIds = Array.isArray(conn.mcpActiveServerIds) && conn.mcpActiveServerIds.length > 0
                ? new Set(conn.mcpActiveServerIds)
                : (conn.mcpActiveServerId ? new Set([conn.mcpActiveServerId]) : new Set());

            activeMcpServers = conn.mcpServers.filter(s =>
                s &&
                activeIds.has(s.id) &&
                s.enabled !== false &&
                s.url &&
                s.url.trim()
            );
        } else if (conn && (conn.mcpServerUrl || conn.mcpTransport)) {
            activeMcpServers = [{
                id: null,
                name: '',
                transport: conn.mcpTransport || 'sse',
                url: conn.mcpServerUrl || '',
                enabled: true,
                toolMode: 'all',
                enabledTools: []
            }];
        }

        const enableMcpTools = conn.mcpEnabled === true && activeMcpServers.length > 0;

        // Convert attachment back to file format if exists
        const files = [];
        if (lastUserAttachment) {
            files.push({
                base64: lastUserAttachment,
                type: 'image/png',
                name: 'regenerate_image.png'
            });
        }

        // Resend the user message
        sendToBackground({
            action: "SEND_PROMPT",
            text: lastUserMessage.text || '',
            files: files,
            model: selectedModel,
            includePageContext: this.app.pageContextActive,
            includeMultiTabContext: this.app.multiTabContextActive, // Separate flag for multi-tab
            enableBrowserControl: this.app.browserControlActive,
            enableMcpTools: enableMcpTools,
            mcpServers: activeMcpServers,
            mcpTransport: activeMcpServers.length > 0 ? (activeMcpServers[0].transport || "sse") : "sse",
            mcpServerUrl: activeMcpServers.length > 0 ? (activeMcpServers[0].url || "") : "",
            mcpServerId: activeMcpServers.length > 0 ? activeMcpServers[0].id : null,
            mcpToolMode: activeMcpServers.length > 0 && activeMcpServers[0].toolMode ? activeMcpServers[0].toolMode : 'all',
            mcpEnabledTools: activeMcpServers.length > 0 && Array.isArray(activeMcpServers[0].enabledTools) ? activeMcpServers[0].enabledTools : [],
            sessionId: currentId,
            isRegeneration: true // Flag to indicate this is a regeneration request
        });
    }
}
