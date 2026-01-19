
// background/handlers/ui.js
import { getActiveTabContent } from './session/utils.js';

export class UIMessageHandler {
    constructor(imageHandler, controlManager, mcpManager) {
        this.imageHandler = imageHandler;
        this.controlManager = controlManager;
        this.mcpManager = mcpManager;
    }

    handle(request, sender, sendResponse) {

        // --- IMAGE FETCHING (USER INPUT) ---
        if (request.action === "FETCH_IMAGE") {
            (async () => {
                try {
                    const result = await this.imageHandler.fetchImage(request.url);
                    chrome.runtime.sendMessage(result).catch(() => { });
                } catch (e) {
                    console.error("Fetch image error", e);
                } finally {
                    sendResponse({ status: "completed" });
                }
            })();
            return true;
        }

        // --- IMAGE FETCHING (GENERATED DISPLAY) ---
        if (request.action === "FETCH_GENERATED_IMAGE") {
            (async () => {
                try {
                    const result = await this.imageHandler.fetchImage(request.url);

                    const payload = {
                        action: "GENERATED_IMAGE_RESULT",
                        reqId: request.reqId,
                        base64: result.base64,
                        error: result.error
                    };

                    // Send back to the specific sender (Tab or Extension Page)
                    if (sender.tab) {
                        chrome.tabs.sendMessage(sender.tab.id, payload).catch(() => { });
                    } else {
                        chrome.runtime.sendMessage(payload).catch(() => { });
                    }

                } catch (e) {
                    console.error("Fetch generated image error", e);
                    const payload = {
                        action: "GENERATED_IMAGE_RESULT",
                        reqId: request.reqId,
                        error: e.message
                    };
                    if (sender.tab) {
                        chrome.tabs.sendMessage(sender.tab.id, payload).catch(() => { });
                    } else {
                        chrome.runtime.sendMessage(payload).catch(() => { });
                    }
                } finally {
                    sendResponse({ status: "completed" });
                }
            })();
            return true;
        }

        if (request.action === "CAPTURE_SCREENSHOT") {
            (async () => {
                try {
                    // Determine correct Window ID
                    let windowId = sender.tab ? sender.tab.windowId : null;
                    if (!windowId) {
                        // Fallback: If triggered from sidepanel, find last focused window
                        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                        if (tab) windowId = tab.windowId;
                    }

                    const result = await this.imageHandler.captureScreenshot(windowId);
                    chrome.runtime.sendMessage(result).catch(() => { });
                } catch (e) {
                    console.error("Screenshot error", e);
                } finally {
                    sendResponse({ status: "completed" });
                }
            })();
            return true;
        }

        // --- SIDEPANEL & SELECTION ---

        if (request.action === "OPEN_SIDE_PANEL") {
            this._handleOpenSidePanel(request, sender).finally(() => {
                sendResponse({ status: "opened" });
            });
            return true;
        }

        if (request.action === "OPEN_SIDE_PANEL_WITH_SUMMARY") {
            // CRITICAL: sidePanel.open() must be called SYNCHRONOUSLY in response to user gesture
            // Do NOT await or use async before this call
            if (!sender.tab) {
                console.warn('[Chubby Cat] No sender.tab for summary');
                sendResponse({ status: "error" });
                return true;
            }

            const tab = sender.tab;

            // Open side panel IMMEDIATELY - this is the synchronous call
            chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId })
                .then(() => {
                    // After panel is opened, perform async operations
                    this._handlePostOpenSummary(tab);
                })
                .catch(err => {
                    console.error("Could not open side panel:", err);
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'SIDEBAR_ICON_LOADING',
                        loading: false
                    }).catch(() => { });
                })
                .finally(() => {
                    sendResponse({ status: "opened" });
                });

            return true;
        }

        if (request.action === "TOGGLE_SIDE_PANEL_CONTROL") {
            this._handleToggleSidePanelControl(request, sender).finally(() => {
                sendResponse({ status: "processed" });
            });
            return true;
        }

        if (request.action === "INITIATE_CAPTURE") {
            (async () => {
                try {
                    console.log('[Chubby Cat] INITIATE_CAPTURE received:', { mode: request.mode, source: request.source });

                    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                    console.log('[Chubby Cat] Active tab found:', tab ? { id: tab.id, url: tab.url?.substring(0, 50) } : 'none');

                    if (!tab) {
                        console.error('[Chubby Cat] No active tab found for capture');
                        return;
                    }

                    // Check if the tab URL can receive content scripts
                    const url = tab.url || '';
                    if (url.startsWith('chrome://') ||
                        url.startsWith('chrome-extension://') ||
                        url.startsWith('edge://') ||
                        url.startsWith('about:') ||
                        url.startsWith('devtools://')) {
                        console.warn('[Chubby Cat] Cannot capture on restricted page:', url.substring(0, 50));
                        // Send error back to sidepanel
                        chrome.runtime.sendMessage({
                            action: "CAPTURE_ERROR",
                            error: "Cannot capture on this page type"
                        }).catch(() => { });
                        return;
                    }

                    // Pre-capture for the overlay background
                    // Pass windowId explicitly to capture the correct window
                    const capture = await this.imageHandler.captureScreenshot(tab.windowId);
                    console.log('[Chubby Cat] Screenshot captured:', capture.base64 ? 'success' : 'failed');

                    // Send message to content script
                    chrome.tabs.sendMessage(tab.id, {
                        action: "START_SELECTION",
                        image: capture.base64,
                        mode: request.mode,
                        source: request.source
                    }).then(() => {
                        console.log('[Chubby Cat] START_SELECTION sent successfully');
                    }).catch((err) => {
                        // This is expected on first load - will retry, so use warn instead of error
                        console.warn('[Chubby Cat] Content script not ready, attempting retry...', err.message);
                        // Try to inject content script and retry
                        this._injectContentScriptAndRetry(tab.id, capture, request);
                    });
                } catch (err) {
                    console.error('[Chubby Cat] INITIATE_CAPTURE error:', err);
                }
            })();
            return false;
        }

        if (request.action === "AREA_SELECTED") {
            (async () => {
                try {
                    // Use windowId from sender tab to ensure we capture the same window where selection occurred
                    const windowId = sender.tab ? sender.tab.windowId : null;
                    const result = await this.imageHandler.captureArea(request.area, windowId);
                    if (result && sender.tab) {
                        // Send specifically to the tab that initiated the selection
                        chrome.tabs.sendMessage(sender.tab.id, result).catch(() => { });
                    }
                } catch (e) {
                    console.error("Area capture error", e);
                } finally {
                    sendResponse({ status: "completed" });
                }
            })();
            return true;
        }

        if (request.action === "PROCESS_CROP_IN_SIDEPANEL") {
            // Broadcast the crop result to runtime so Side Panel can pick it up
            chrome.runtime.sendMessage(request.payload).catch(() => { });
            sendResponse({ status: "forwarded" });
            return true;
        }

        if (request.action === "GET_ACTIVE_SELECTION") {
            (async () => {
                const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                if (tab) {
                    try {
                        const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_SELECTION" });
                        chrome.runtime.sendMessage({
                            action: "SELECTION_RESULT",
                            text: response ? response.selection : ""
                        }).catch(() => { });
                    } catch (e) {
                        chrome.runtime.sendMessage({ action: "SELECTION_RESULT", text: "" }).catch(() => { });
                    }
                }
                sendResponse({ status: "completed" });
            })();
            return true;
        }

        // --- PAGE CONTEXT CHECK ---
        if (request.action === "CHECK_PAGE_CONTEXT") {
            (async () => {
                const content = await getActiveTabContent();
                const length = content ? content.length : 0;
                sendResponse({ action: "PAGE_CONTEXT_RESULT", length: length });
            })();
            return true;
        }

        // --- ACTIVE TAB INFO (for tab title display) ---
        if (request.action === "GET_ACTIVE_TAB_INFO") {
            (async () => {
                try {
                    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                    if (tab) {
                        chrome.runtime.sendMessage({
                            action: "ACTIVE_TAB_INFO",
                            tab: {
                                id: tab.id,
                                title: tab.title,
                                url: tab.url,
                                favIconUrl: tab.favIconUrl
                            }
                        }).catch(() => { });
                    }
                } catch (e) {
                    console.error("Error getting active tab info:", e);
                }
                sendResponse({ status: "completed" });
            })();
            return true;
        }

        // --- TABS FOR CONTEXT SELECTION ---
        if (request.action === "GET_OPEN_TABS_FOR_CONTEXT") {
            (async () => {
                try {
                    const tabs = await chrome.tabs.query({ currentWindow: true });
                    const safeTabs = tabs
                        .filter(t => !t.url.startsWith('chrome://') &&
                            !t.url.startsWith('chrome-extension://') &&
                            !t.url.startsWith('edge://') &&
                            !t.url.startsWith('about:'))
                        .map(t => ({
                            id: t.id,
                            title: t.title,
                            url: t.url,
                            favIconUrl: t.favIconUrl,
                            active: t.active
                        }));

                    chrome.runtime.sendMessage({
                        action: "TABS_FOR_CONTEXT",
                        tabs: safeTabs
                    }).catch(() => { });
                } catch (e) {
                    console.error("Error getting tabs for context:", e);
                }
                sendResponse({ status: "completed" });
            })();
            return true;
        }

        // --- IMPORT MULTIPLE TAB CONTENTS ---
        if (request.action === "IMPORT_TABS_CONTENT") {
            (async () => {
                try {
                    const tabIds = request.tabIds || [];
                    if (tabIds.length === 0) {
                        chrome.runtime.sendMessage({
                            action: "TABS_CONTENT_ERROR",
                            error: "No tabs selected"
                        }).catch(() => { });
                        sendResponse({ status: "error" });
                        return;
                    }

                    let combinedContent = "";
                    let successCount = 0;

                    for (const tabId of tabIds) {
                        try {
                            const content = await getActiveTabContent(tabId);
                            if (content) {
                                // Get tab title for context
                                let tabTitle = "Unknown Tab";
                                try {
                                    const tabInfo = await chrome.tabs.get(tabId);
                                    tabTitle = tabInfo.title || tabInfo.url || tabTitle;
                                } catch (e) { }

                                // Add separator and content
                                if (combinedContent) {
                                    combinedContent += "\n\n---\n\n";
                                }
                                combinedContent += `## ${tabTitle}\n\n${content}`;
                                successCount++;
                            }
                        } catch (e) {
                            console.warn(`Failed to get content from tab ${tabId}:`, e);
                        }
                    }

                    if (successCount > 0) {
                        // Store the combined context for use in prompts
                        await chrome.storage.session.set({
                            multiTabContext: combinedContent,
                            multiTabCount: successCount
                        });

                        chrome.runtime.sendMessage({
                            action: "TABS_CONTENT_IMPORTED",
                            success: true,
                            count: successCount,
                            totalChars: combinedContent.length
                        }).catch(() => { });
                    } else {
                        chrome.runtime.sendMessage({
                            action: "TABS_CONTENT_ERROR",
                            error: "Could not extract content from selected tabs"
                        }).catch(() => { });
                    }
                } catch (e) {
                    console.error("Error importing tab contents:", e);
                    chrome.runtime.sendMessage({
                        action: "TABS_CONTENT_ERROR",
                        error: e.message || "Import failed"
                    }).catch(() => { });
                }
                sendResponse({ status: "completed" });
            })();
            return true;
        }

        // --- CLEAR MULTI-TAB CONTEXT ---
        if (request.action === "CLEAR_MULTI_TAB_CONTEXT") {
            (async () => {
                try {
                    await chrome.storage.session.remove(['multiTabContext', 'multiTabCount']);
                } catch (e) {
                    console.warn("Failed to clear multi-tab context:", e);
                }
                sendResponse({ status: "cleared" });
            })();
            return true;
        }

        // --- MCP (External Tools) ---
        if (request.action === "MCP_TEST_CONNECTION") {
            (async () => {
                try {
                    if (!this.mcpManager) throw new Error("MCP manager not available");
                    const url = (request.url || "").trim();
                    const transport = (request.transport || "sse").toLowerCase();
                    if (!url) throw new Error("Server URL is empty");

                    const tools = await this.mcpManager.listTools({
                        enableMcpTools: true,
                        mcpTransport: transport,
                        mcpServerUrl: url
                    });

                    sendResponse({
                        action: "MCP_TEST_RESULT",
                        ok: true,
                        serverId: request.serverId || null,
                        transport,
                        url,
                        toolsCount: Array.isArray(tools) ? tools.length : 0
                    });
                } catch (e) {
                    sendResponse({
                        action: "MCP_TEST_RESULT",
                        ok: false,
                        serverId: request.serverId || null,
                        transport: request.transport || "sse",
                        url: request.url || "",
                        error: e.message || String(e)
                    });
                }
            })();
            return true;
        }

        if (request.action === "MCP_LIST_TOOLS") {
            (async () => {
                try {
                    if (!this.mcpManager) throw new Error("MCP manager not available");
                    const url = (request.url || "").trim();
                    const transport = (request.transport || "sse").toLowerCase();
                    if (!url) throw new Error("Server URL is empty");

                    const tools = await this.mcpManager.listTools({
                        enableMcpTools: true,
                        mcpTransport: transport,
                        mcpServerUrl: url
                    });

                    // Return only lightweight fields for UI
                    const safeTools = Array.isArray(tools) ? tools.map(t => ({
                        name: t.name,
                        description: t.description || ""
                    })) : [];

                    sendResponse({
                        action: "MCP_TOOLS_RESULT",
                        ok: true,
                        serverId: request.serverId || null,
                        transport,
                        url,
                        tools: safeTools
                    });
                } catch (e) {
                    sendResponse({
                        action: "MCP_TOOLS_RESULT",
                        ok: false,
                        serverId: request.serverId || null,
                        transport: request.transport || "sse",
                        url: request.url || "",
                        error: e.message || String(e),
                        tools: []
                    });
                }
            })();
            return true;
        }

        // --- TAB MANAGEMENT ---

        if (request.action === "GET_OPEN_TABS") {
            (async () => {
                const tabs = await chrome.tabs.query({ currentWindow: true });
                const safeTabs = tabs.map(t => ({
                    id: t.id,
                    title: t.title,
                    url: t.url,
                    favIconUrl: t.favIconUrl,
                    active: t.active
                }));

                // Get the currently locked tab ID to inform UI state
                const lockedTabId = this.controlManager ? this.controlManager.getTargetTabId() : null;

                chrome.runtime.sendMessage({
                    action: "OPEN_TABS_RESULT",
                    tabs: safeTabs,
                    lockedTabId: lockedTabId
                }).catch(() => { });
                sendResponse({ status: "completed" });
            })();
            return true;
        }

        if (request.action === "SWITCH_TAB") {
            // tabId can be null to unlock
            if (this.controlManager) {
                this.controlManager.setTargetTab(request.tabId || null);
            }
            // Only switch visual tab if a specific ID is provided AND switchVisual is not explicitly false
            if (request.tabId && request.switchVisual !== false) {
                chrome.tabs.update(request.tabId, { active: true }).catch(err => console.warn(err));
            }
            sendResponse({ status: "switched" });
            return true;
        }

        // --- BROWSER CONTROL TOGGLE ---
        if (request.action === "TOGGLE_BROWSER_CONTROL") {
            if (this.controlManager) {
                if (request.enabled) {
                    this.controlManager.enableControl();
                } else {
                    this.controlManager.disableControl();
                }
            }
            sendResponse({ status: "processed" });
            return true;
        }

        return false;
    }

    async _handleOpenSidePanel(request, sender) {
        if (sender.tab) {
            const openPromise = chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId })
                .catch(err => console.error("Could not open side panel:", err));

            const updateOps = {};
            if (request.sessionId) updateOps.pendingSessionId = request.sessionId;
            if (request.mode) updateOps.pendingMode = request.mode;

            if (Object.keys(updateOps).length > 0) {
                await chrome.storage.local.set(updateOps);
                // Clear pending items after a timeout to prevent stale actions
                setTimeout(() => {
                    const keys = Object.keys(updateOps);
                    chrome.storage.local.remove(keys);
                }, 5000);
            }

            try { await openPromise; } catch (e) { }

            // If immediate execution needed after open (panel might already be open)
            setTimeout(() => {
                if (request.sessionId) {
                    chrome.runtime.sendMessage({
                        action: "SWITCH_SESSION",
                        sessionId: request.sessionId
                    }).catch(() => { });
                }
                if (request.mode === 'browser_control') {
                    chrome.runtime.sendMessage({
                        action: "ACTIVATE_BROWSER_CONTROL"
                    }).catch(() => { });
                }
            }, 500);
        }
    }

    /**
     * Open side panel and automatically trigger page summary
     * This is triggered by the floating sidebar icon
     * IMPORTANT: sidePanel.open() must be called IMMEDIATELY in response to user gesture
     * Any async operation before sidePanel.open() will break the user gesture context
     */
    async _handlePostOpenSummary(tab) {
        try {
            // Get page content for context
            const pageContent = await getActiveTabContent(tab.id);
            const hasContent = pageContent && pageContent.length > 0;

            // Get custom summary prompt from storage
            const storage = await chrome.storage.local.get(['geminiSummaryPrompt']);
            const summaryPrompt = storage.geminiSummaryPrompt || '请总结这个网页的主要内容';

            // Store pending summary action
            await chrome.storage.local.set({
                pendingSummaryAction: {
                    prompt: summaryPrompt,
                    hasPageContext: hasContent,
                    tabId: tab.id,
                    timestamp: Date.now()
                }
            });

            // Notify content script that loading is complete
            chrome.tabs.sendMessage(tab.id, {
                action: 'SIDEBAR_ICON_LOADING',
                loading: false
            }).catch(() => { });

            // Send message to trigger summary after panel is ready
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: "TRIGGER_PAGE_SUMMARY",
                    prompt: summaryPrompt,
                    hasPageContext: hasContent
                }).catch(() => { });

                // Clear pending action after a delay
                setTimeout(() => {
                    chrome.storage.local.remove(['pendingSummaryAction']);
                }, 3000);
            }, 500);

        } catch (err) {
            console.error('[Chubby Cat] Error in _handlePostOpenSummary:', err);

            // Notify content script to stop loading on error
            chrome.tabs.sendMessage(tab.id, {
                action: 'SIDEBAR_ICON_LOADING',
                loading: false
            }).catch(() => { });
        }
    }

    async _handleToggleSidePanelControl(request, sender) {
        if (!sender.tab) return;

        const tabId = sender.tab.id;
        const currentLock = this.controlManager ? this.controlManager.getTargetTabId() : null;

        // Is Browser Control active for this tab?
        const isControlActive = (currentLock === tabId);

        if (isControlActive) {
            // --- TOGGLE OFF ---

            // 1. Disable Control (Detach debugger)
            if (this.controlManager) {
                await this.controlManager.disableControl();
            }

            // 2. Close Side Panel (Workaround: disable then enable)
            try {
                // This effectively closes the side panel for this tab
                await chrome.sidePanel.setOptions({ tabId, enabled: false });

                // Re-enable it quickly so it can be opened again later
                setTimeout(() => {
                    chrome.sidePanel.setOptions({ tabId, enabled: true, path: 'sidepanel/index.html' });
                }, 250);
            } catch (e) {
                console.error("Failed to toggle side panel close:", e);
            }

        } else {
            // --- TOGGLE ON ---
            await this._handleOpenSidePanel({ ...request, mode: 'browser_control' }, sender);
        }
    }

    /**
     * Inject content scripts dynamically and retry the capture operation
     * @param {number} tabId - The tab to inject scripts into
     * @param {object} capture - The captured screenshot data
     * @param {object} request - Original request with mode and source
     */
    async _injectContentScriptAndRetry(tabId, capture, request) {
        try {
            console.log('[Chubby Cat] Checking if content scripts are already loaded in tab:', tabId);

            // First, check if content scripts are already loaded to avoid duplicate declarations
            let scriptsAlreadyLoaded = false;
            try {
                const checkResult = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        // Check if our content script globals exist
                        return !!(window.ChubbyCatOverlay && window.GeminiToolbarActions);
                    }
                });
                scriptsAlreadyLoaded = checkResult && checkResult[0] && checkResult[0].result === true;
            } catch (checkErr) {
                console.log('[Chubby Cat] Could not check script status:', checkErr.message);
                scriptsAlreadyLoaded = false;
            }

            if (scriptsAlreadyLoaded) {
                // Scripts are already loaded, just wait for them to fully initialize and retry
                console.log('[Chubby Cat] Content scripts already loaded, waiting for initialization...');
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                // Scripts not loaded, inject them
                console.log('[Chubby Cat] Injecting content scripts...');

                // Inject all required content scripts in order
                const scripts = [
                    'content/overlay.js',
                    'content/toolbar/icons.js',
                    'content/toolbar/styles/core.js',
                    'content/toolbar/styles/widget.js',
                    'content/toolbar/styles/markdown.js',
                    'content/toolbar/styles/panel/layout.js',
                    'content/toolbar/styles/panel/header.js',
                    'content/toolbar/styles/panel/body.js',
                    'content/toolbar/styles/panel/footer.js',
                    'content/toolbar/styles/panel/index.js',
                    'content/toolbar/styles/index.js',
                    'content/toolbar/bridge.js',
                    'content/toolbar/utils/drag.js',
                    'content/toolbar/i18n.js',
                    'content/toolbar/templates.js',
                    'content/toolbar/view/utils.js',
                    'content/toolbar/view/widget.js',
                    'content/toolbar/view/window.js',
                    'content/toolbar/view/dom.js',
                    'content/toolbar/view/index.js',
                    'content/toolbar/events.js',
                    'content/toolbar/ui/grammar.js',
                    'content/toolbar/ui/renderer.js',
                    'content/toolbar/ui/actions_delegate.js',
                    'content/toolbar/ui/code_copy.js',
                    'content/toolbar/ui/manager.js',
                    'content/toolbar/actions.js',
                    'content/toolbar/image.js',
                    'content/toolbar/stream.js',
                    'content/toolbar/utils/input.js',
                    'content/selection.js',
                    'content/toolbar/dispatch.js',
                    'content/toolbar/crop.js',
                    'content/toolbar/controller.js',
                    'content/shortcuts.js',
                    'content/messages.js',
                    'content/index.js'
                ];

                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: scripts
                });

                console.log('[Chubby Cat] Content scripts injected, waiting for initialization...');

                // Wait a bit for scripts to initialize
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Retry sending the message
            await chrome.tabs.sendMessage(tabId, {
                action: "START_SELECTION",
                image: capture.base64,
                mode: request.mode,
                source: request.source
            });

            console.log('[Chubby Cat] START_SELECTION sent successfully after retry');
        } catch (err) {
            console.error('[Chubby Cat] Failed to inject content scripts:', err.message);
            // Send error notification to sidepanel
            chrome.runtime.sendMessage({
                action: "CAPTURE_ERROR",
                error: "Failed to start capture: " + err.message
            }).catch(() => { });
        }
    }
}
