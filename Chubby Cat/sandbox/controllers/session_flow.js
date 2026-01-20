
// sandbox/controllers/session_flow.js
import { appendMessage } from '../render/message.js';
import { sendToBackground, saveSessionsToStorage } from '../../lib/messaging.js';
import { TOOL_OUTPUT_MARKER, TOOL_OUTPUT_PREFIX } from '../../lib/constants.js';
import { t } from '../core/i18n.js';

export class SessionFlowController {
    constructor(sessionManager, uiController, appController) {
        this.sessionManager = sessionManager;
        this.ui = uiController;
        this.app = appController;
    }

    _isToolOutputMessage(msg) {
        if (!msg) return false;
        if (msg.isToolOutput === true) return true;
        if (!msg.text || typeof msg.text !== 'string') return false;
        const normalized = msg.text.trimStart();
        return normalized.startsWith(TOOL_OUTPUT_PREFIX) || normalized.startsWith(TOOL_OUTPUT_MARKER);
    }

    _getDisplayMessages(session) {
        if (!session || !Array.isArray(session.messages)) return [];
        return session.messages.filter(msg => !this._isToolOutputMessage(msg));
    }

    _getDisplaySessions(sessions) {
        if (!Array.isArray(sessions)) return [];
        return sessions.map(session => ({
            ...session,
            messages: this._getDisplayMessages(session)
        }));
    }

    handleNewChat() {
        if (this.app.isGenerating) this.app.prompt.cancel();

        this.app.messageHandler.resetStream();

        const s = this.sessionManager.createSession();
        s.title = t('newChat');
        this.switchToSession(s.id);
    }

    switchToSession(sessionId) {
        if (this.app.isGenerating) this.app.prompt.cancel();

        this.app.messageHandler.resetStream();
        this.sessionManager.setCurrentId(sessionId);

        const session = this.sessionManager.getCurrentSession();
        if (!session) return;

        this.ui.clearChatHistory();
        const displayMessages = this._getDisplayMessages(session);
        displayMessages.forEach(msg => {
            let attachment = null;
            if (msg.role === 'user') attachment = msg.image;
            if (msg.role === 'ai') attachment = msg.generatedImages;
            // Pass msg.thoughts to appendMessage
            appendMessage(this.ui.historyDiv, msg.text, msg.role, attachment, msg.thoughts);
        });
        this.ui.scrollToBottom();

        if (session.context) {
            sendToBackground({
                action: "SET_CONTEXT",
                context: session.context,
                model: this.app.getSelectedModel()
            });
        } else {
            sendToBackground({ action: "RESET_CONTEXT" });
        }

        this.refreshHistoryUI();
        // Note: We intentionally do NOT call this.ui.resetInput() here.
        // User's current input should be preserved when switching sessions.
        // Input is only cleared when a message is sent (in prompt.js).
    }

    refreshHistoryUI() {
        this.ui.renderHistoryList(
            this._getDisplaySessions(this.sessionManager.getSortedSessions()),
            this.sessionManager.currentSessionId,
            {
                onSwitch: (id) => this.switchToSession(id),
                onDelete: (id) => this.handleDeleteSession(id)
            }
        );
    }

    handleDeleteSession(sessionId) {
        const switchNeeded = this.sessionManager.deleteSession(sessionId);
        saveSessionsToStorage(this.sessionManager.sessions);

        if (switchNeeded) {
            if (this.sessionManager.sessions.length > 0) {
                this.switchToSession(this.sessionManager.currentSessionId);
            } else {
                this.handleNewChat();
            }
        } else {
            this.refreshHistoryUI();
        }
    }
}
