
// sandbox/controllers/app_controller.js
import { MessageHandler } from './message_handler.js';
import { SessionFlowController } from './session_flow.js';
import { PromptController } from './prompt.js';
import { t } from '../core/i18n.js';
import { saveSessionsToStorage, sendToBackground } from '../../lib/messaging.js';

export class AppController {
    constructor(sessionManager, uiController, imageManager) {
        this.sessionManager = sessionManager;
        this.ui = uiController;
        this.imageManager = imageManager;

        this.captureMode = 'snip';
        this.isGenerating = false;
        this.pageContextActive = false;
        this.multiTabContextActive = false; // Separate state for multi-tab import
        this.browserControlActive = false;

        // Sidebar Restore Behavior: 'auto', 'restore', 'new'
        this.sidebarRestoreBehavior = 'auto';

        // Initialize Message Handler
        this.messageHandler = new MessageHandler(
            sessionManager,
            uiController,
            imageManager,
            this
        );

        // Initialize Sub-Controllers
        this.sessionFlow = new SessionFlowController(sessionManager, uiController, this);
        this.prompt = new PromptController(sessionManager, uiController, imageManager, this);

        // Initialize Active Tab Controller with callbacks
        this._initActiveTabController();

        // Listen for MCP settings changes to sync button state
        document.addEventListener('mcp-settings-changed', () => {
            this.syncMcpButtonState();
        });
    }

    setCaptureMode(mode) {
        this.captureMode = mode;
    }

    togglePageContext() {
        this.pageContextActive = !this.pageContextActive;
        this.ui.chat.togglePageContext(this.pageContextActive);

        if (this.pageContextActive) {
            this._checkPageContent();
        }
    }

    setPageContext(enable) {
        if (this.pageContextActive !== enable) {
            this.togglePageContext();
        } else if (enable) {
            this._checkPageContent();
        }
    }

    _checkPageContent() {
        this.ui.updateStatus(t('readingPage'));
        sendToBackground({ action: "CHECK_PAGE_CONTEXT" });
    }

    _initActiveTabController() {
        this.ui.initActiveTabController({
            onImportStart: (count) => {
                this.ui.updateStatus(t('importingTabs'));
            },
            onImportComplete: (result) => {
                if (result && result.success) {
                    // Show message in the same format as pageReadSuccess for consistency
                    const formatted = new Intl.NumberFormat().format(result.totalChars || 0);
                    const msg = t('pageReadSuccess').replace('{count}', formatted);
                    this.ui.updateStatus(msg);

                    // Mark multi-tab context as active (separate from page button)
                    this.multiTabContextActive = true;

                    setTimeout(() => {
                        if (!this.isGenerating) this.ui.updateStatus("");
                    }, 3000);
                }
            },
            onImportError: (error) => {
                this.ui.updateStatus(error || 'Import failed');
                setTimeout(() => {
                    if (!this.isGenerating) this.ui.updateStatus("");
                }, 3000);
            },
            onContextCleared: () => {
                // When all multi-tabs are deselected, reset multi-tab context state
                // This does NOT affect the page button state - they are independent
                this.multiTabContextActive = false;
                this.ui.updateStatus("");
            }
        });
    }

    toggleBrowserControl(forceState = null) {
        // If forceState is provided, match it. Otherwise toggle.
        if (forceState !== null) {
            if (this.browserControlActive === forceState) return;
            this.browserControlActive = forceState;
        } else {
            this.browserControlActive = !this.browserControlActive;
        }

        const btn = document.getElementById('browser-control-btn');
        if (btn) {
            btn.classList.toggle('active', this.browserControlActive);
        }

        // Show/Hide the tab switcher in header
        this.ui.toggleTabSwitcher(this.browserControlActive);

        // Signal background to start/stop debugger session immediately
        sendToBackground({
            action: "TOGGLE_BROWSER_CONTROL",
            enabled: this.browserControlActive
        });

        if (this.browserControlActive) {
            // Disable page context if browser control is on (optional preference, 
            // but usually commands don't need full page context context)
            // For now, keeping them independent.
        }
    }

    /**
     * Sync MCP button/panel state with current settings (called on init/restore)
     * Delegates to McpServersController if available
     */
    syncMcpButtonState() {
        if (this.mcpServersController && typeof this.mcpServersController.syncFromSettings === 'function') {
            this.mcpServersController.syncFromSettings();
        }
    }

    handleTabSwitcher() {
        sendToBackground({ action: "GET_OPEN_TABS" });
    }

    handleTabSelected(tabId, shouldSwitch = true) {
        // tabId can be null (to unlock) or an integer
        sendToBackground({ action: "SWITCH_TAB", tabId: tabId, switchVisual: shouldSwitch });
    }

    // --- Delegation to Sub-Controllers ---

    handleNewChat() {
        this.sessionFlow.handleNewChat();
    }

    switchToSession(sessionId) {
        this.sessionFlow.switchToSession(sessionId);
    }

    rerender() {
        const currentId = this.sessionManager.currentSessionId;
        if (currentId) {
            this.switchToSession(currentId);
        }
    }

    getSelectedModel() {
        return this.ui.modelSelect ? this.ui.modelSelect.value : "gemini-2.5-flash";
    }

    handleModelChange(model) {
        window.parent.postMessage({ action: 'SAVE_MODEL', payload: model }, '*');
    }

    handleDeleteSession(sessionId) {
        this.sessionFlow.handleDeleteSession(sessionId);
    }

    handleCancel() {
        this.prompt.cancel();
    }

    handleSendMessage() {
        this.prompt.send();
    }

    // --- Event Handling ---

    async handleIncomingMessage(event) {
        const { action, payload } = event.data;

        if (action === 'RESTORE_SIDEBAR_BEHAVIOR') {
            this.sidebarRestoreBehavior = payload;
            // Update UI settings panel
            this.ui.settings.updateSidebarBehavior(payload);
            return;
        }

        // Restore Sessions
        if (action === 'RESTORE_SESSIONS') {
            this.sessionManager.setSessions(payload || []);
            this.sessionFlow.refreshHistoryUI();

            const currentId = this.sessionManager.currentSessionId;
            const currentSessionExists = this.sessionManager.getCurrentSession();

            // If we are initializing (no current session yet), apply the behavior logic
            if (!currentId || !currentSessionExists) {
                const sorted = this.sessionManager.getSortedSessions();

                let shouldRestore = false;

                if (this.sidebarRestoreBehavior === 'new') {
                    shouldRestore = false;
                } else if (this.sidebarRestoreBehavior === 'restore') {
                    shouldRestore = true;
                } else {
                    // 'auto' mode: Restore if last active within 10 minutes
                    if (sorted.length > 0) {
                        const lastActive = sorted[0].timestamp;
                        const now = Date.now();
                        const tenMinutes = 10 * 60 * 1000;
                        if (now - lastActive < tenMinutes) {
                            shouldRestore = true;
                        }
                    }
                }

                if (shouldRestore && sorted.length > 0) {
                    this.switchToSession(sorted[0].id);
                } else {
                    this.handleNewChat();
                }
            }
            return;
        }

        if (action === 'RESTORE_CONNECTION_SETTINGS') {
            this.ui.settings.updateConnectionSettings(payload);
            // Fix: Pass the full settings payload object, not just the boolean flag
            this.ui.updateModelList(payload);
            // Sync MCP toggle button state with restored settings
            this.syncMcpButtonState();
            return;
        }

        if (action === 'BACKGROUND_MESSAGE') {
            if (payload.action === 'SWITCH_SESSION') {
                this.switchToSession(payload.sessionId);
                return;
            }
            if (payload.action === 'ACTIVATE_BROWSER_CONTROL') {
                this.toggleBrowserControl(true);
                if (this.ui.inputFn) this.ui.inputFn.focus();
                return;
            }
            // Tab list response
            if (payload.action === 'OPEN_TABS_RESULT') {
                this.ui.openTabSelector(payload.tabs, (tabId, shouldSwitch) => this.handleTabSelected(tabId, shouldSwitch), payload.lockedTabId);
                return;
            }
            // Tab Locked Notification (Auto-lock update)
            if (payload.action === 'TAB_LOCKED') {
                if (this.ui && this.ui.tabSelector) {
                    this.ui.tabSelector.updateTrigger(payload.tab);
                }
                return;
            }
            // Page Context Check Result
            if (payload.action === 'PAGE_CONTEXT_RESULT') {
                const len = payload.length;
                const formatted = new Intl.NumberFormat().format(len);
                const msg = t('pageReadSuccess').replace('{count}', formatted);
                this.ui.updateStatus(msg);
                setTimeout(() => { if (!this.isGenerating) this.ui.updateStatus(""); }, 3000);
                return;
            }

            // Active Tab Info (for displaying current tab title)
            if (payload.action === 'ACTIVE_TAB_INFO') {
                this.ui.updateActiveTabInfo(payload.tab);
                return;
            }

            // Tabs list for context selection modal
            if (payload.action === 'TABS_FOR_CONTEXT') {
                this.ui.populateTabsForContext(payload.tabs);
                return;
            }

            // Tab content import complete
            if (payload.action === 'TABS_CONTENT_IMPORTED') {
                this.ui.onTabsImportComplete({
                    success: payload.success,
                    count: payload.count,
                    totalChars: payload.totalChars
                });
                return;
            }

            // Tab content import error
            if (payload.action === 'TABS_CONTENT_ERROR') {
                this.ui.onTabsImportError(payload.error);
                return;
            }

            // Trigger page summary (from sidebar icon click)
            if (payload.action === 'TRIGGER_PAGE_SUMMARY') {
                this._handleTriggerPageSummary(payload);
                return;
            }

            await this.messageHandler.handle(payload);
        }

        // Pass other messages to message bridge handler if not handled here
        // (AppMessageBridge handles standard restores, this controller handles extended logic)
    }

    /**
     * Handle trigger page summary action from sidebar icon
     * @param {Object} payload - { prompt: string, hasPageContext: boolean }
     */
    _handleTriggerPageSummary(payload) {
        const { prompt, hasPageContext } = payload;

        // Skip if already generating
        if (this.isGenerating) {
            return;
        }

        // Enable page context if available
        if (hasPageContext && !this.pageContextActive) {
            this.pageContextActive = true;
            this.ui.chat.togglePageContext(true);
        }

        // Set the prompt text
        if (this.ui.inputFn) {
            this.ui.inputFn.value = prompt || '请总结这个网页的主要内容';
        }

        // Show status
        this.ui.updateStatus(t('readingPage'));

        // Wait a short delay for UI to settle, then send
        setTimeout(() => {
            this.handleSendMessage();
        }, 100);
    }
}