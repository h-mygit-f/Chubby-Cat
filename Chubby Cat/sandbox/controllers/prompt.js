
// sandbox/controllers/prompt.js
import { appendMessage } from '../render/message.js';
import { sendToBackground, saveSessionsToStorage } from '../../lib/messaging.js';
import { t } from '../core/i18n.js';

// Safety timeout for regenerate buttons (2 minutes)
// If backend doesn't respond within this time, buttons will be re-enabled
const GENERATION_SAFETY_TIMEOUT_MS = 120000;
const TOOL_OUTPUT_MARKER = '**Tool Output:**';

export class PromptController {
    constructor(sessionManager, uiController, imageManager, appController) {
        this.sessionManager = sessionManager;
        this.ui = uiController;
        this.imageManager = imageManager;
        this.app = appController;
        this.cancellationTimestamp = 0;
        this.generationTimeout = null; // Safety timeout for button recovery
    }

    /**
     * Start a safety timeout that will re-enable regenerate buttons
     * if the generation takes too long or backend fails to respond
     */
    _startSafetyTimeout() {
        this._clearSafetyTimeout();
        this.generationTimeout = setTimeout(() => {
            // If still generating after timeout, force-recover the UI state
            if (this.app.isGenerating) {
                console.warn('[Chubby Cat] Generation safety timeout reached, recovering UI state');
                this.app.isGenerating = false;
                this.ui.setLoading(false);
                if (this.app.messageHandler && this.app.messageHandler.enableAllRegenerateButtons) {
                    this.app.messageHandler.enableAllRegenerateButtons();
                }
            }
        }, GENERATION_SAFETY_TIMEOUT_MS);
    }

    /**
     * Clear the safety timeout (called when generation completes normally)
     */
    _clearSafetyTimeout() {
        if (this.generationTimeout) {
            clearTimeout(this.generationTimeout);
            this.generationTimeout = null;
        }
    }

    _isToolOutputText(text) {
        if (!text || typeof text !== 'string') return false;
        return text.includes(TOOL_OUTPUT_MARKER);
    }

    _findLastUserMessageIndex(messages, beforeIndex) {
        const start = typeof beforeIndex === 'number' ? beforeIndex - 1 : messages.length - 1;
        for (let i = start; i >= 0; i--) {
            if (messages[i].role === 'user' && !this._isToolOutputText(messages[i].text || '')) {
                return i;
            }
        }
        return -1;
    }

    _removeUiMessagesAfterLastUser() {
        const chatHistory = this.ui.historyDiv;
        if (!chatHistory) return;

        const userMessages = Array.from(chatHistory.querySelectorAll('.msg.user'));
        let lastRealUser = null;
        for (let i = userMessages.length - 1; i >= 0; i--) {
            const node = userMessages[i];
            if (!this._isToolOutputText(node.textContent || '')) {
                lastRealUser = node;
                break;
            }
        }

        if (!lastRealUser) return;

        let node = lastRealUser.nextElementSibling;
        while (node) {
            const next = node.nextElementSibling;
            node.remove();
            node = next;
        }
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

        // Start safety timeout to recover UI if backend fails to respond
        this._startSafetyTimeout();

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

        // Clear safety timeout since we're explicitly cancelling
        this._clearSafetyTimeout();

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
     * 2. Remove the current AI response chain from the session
     * 3. Resend the last user message to get a new AI response
     */
    async regenerate() {
        console.log('[Chubby Cat] regenerate() called');

        // Don't allow regeneration if already generating
        if (this.app.isGenerating) {
            console.log('[Chubby Cat] Already generating, cancelling first');
            this.cancel();
            // Wait a bit for cancellation to take effect
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const currentId = this.sessionManager.currentSessionId;
        const session = this.sessionManager.getCurrentSession();

        if (!session || session.messages.length < 2) {
            console.log('[Chubby Cat] No session or insufficient messages, enabling buttons');
            // Need at least one user message and one AI message
            // Re-enable buttons in case they were somehow disabled
            if (this.app.messageHandler && this.app.messageHandler.enableAllRegenerateButtons) {
                this.app.messageHandler.enableAllRegenerateButtons();
            }
            return;
        }

        // Wrap entire regeneration logic in try-catch to ensure buttons are always re-enabled
        try {
            console.log('[Chubby Cat] Starting regeneration process');

            // Find the last AI message and its preceding user message
            const messages = session.messages;
            console.log('[Chubby Cat] Session has', messages.length, 'messages');

            let lastAiIndex = -1;
            let lastUserMessage = null;
            let lastUserAttachment = null;
            let lastUserIndex = -1;

            // Find the last AI message
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'ai') {
                    lastAiIndex = i;
                    break;
                }
            }

            if (lastAiIndex === -1) {
                console.warn('[Chubby Cat] No AI message found, cannot regenerate');
                // Re-enable buttons since we're returning early
                if (this.app.messageHandler && this.app.messageHandler.enableAllRegenerateButtons) {
                    this.app.messageHandler.enableAllRegenerateButtons();
                }
                return; // No AI message to regenerate
            }

            console.log('[Chubby Cat] Found last AI message at index', lastAiIndex);

            lastUserIndex = this._findLastUserMessageIndex(messages, lastAiIndex);
            if (lastUserIndex === -1) {
                console.warn('[Chubby Cat] No user message found before AI message, cannot regenerate');
                // Re-enable buttons since we're returning early
                if (this.app.messageHandler && this.app.messageHandler.enableAllRegenerateButtons) {
                    this.app.messageHandler.enableAllRegenerateButtons();
                }
                return; // No user message found
            }

            lastUserMessage = messages[lastUserIndex];
            lastUserAttachment = lastUserMessage.image || null;

            console.log('[Chubby Cat] Found user message to resend:', lastUserMessage.text?.substring(0, 50));

            // Remove the current AI response chain from the UI (tool calls + responses)
            this._removeUiMessagesAfterLastUser();
            if (this.app.messageHandler && this.app.messageHandler.resetStream) {
                this.app.messageHandler.resetStream();
            }

            // Remove the current AI response chain from session
            if (messages.length > lastUserIndex + 1) {
                session.messages.splice(lastUserIndex + 1);
                saveSessionsToStorage(this.sessionManager.sessions);
            }

            // Update status
            this.ui.updateStatus(t('regenerating'));

            // Disable all regenerate buttons to prevent multiple concurrent regenerations
            if (this.app.messageHandler && this.app.messageHandler.disableAllRegenerateButtons) {
                this.app.messageHandler.disableAllRegenerateButtons();
            }

            // Prepare to resend
            this.app.isGenerating = true;
            this.ui.setLoading(true);

            // Start safety timeout to recover UI if backend fails to respond
            this._startSafetyTimeout();

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
            console.log('[Chubby Cat] Sending SEND_PROMPT to background with model:', selectedModel);
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

        } catch (error) {
            // If any error occurs during regeneration setup, ensure we reset state
            console.error('Regenerate error:', error);

            // Clear safety timeout since we're handling the error ourselves
            this._clearSafetyTimeout();

            this.app.isGenerating = false;
            this.ui.setLoading(false);
            this.ui.updateStatus(t('errorScreenshot'));
            setTimeout(() => this.ui.updateStatus(""), 3000);

            // CRITICAL: Always re-enable regenerate buttons even on error
            if (this.app.messageHandler && this.app.messageHandler.enableAllRegenerateButtons) {
                this.app.messageHandler.enableAllRegenerateButtons();
            }
        }
    }
}
