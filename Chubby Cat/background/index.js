
// background/index.js
import { GeminiSessionManager } from './managers/session_manager.js';
import { ImageManager } from './managers/image_manager.js';
import { BrowserControlManager } from './managers/control_manager.js';
import { McpRemoteManager } from './managers/mcp_remote_manager.js';
import { LogManager, setupConsoleInterception } from './managers/log_manager.js';
import { setupContextMenus } from './menus.js';
import { setupMessageListener } from './messages.js';
import { keepAliveManager } from './managers/keep_alive.js';

// Setup Sidepanel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Initialize LogManager
const logManager = new LogManager();

// Setup Console Interception (Captures logs for UI download)
setupConsoleInterception(logManager);

console.info("[Chubby Cat] Background Service Worker Started");

// Initialize Managers
const sessionManager = new GeminiSessionManager();
const imageManager = new ImageManager();
const controlManager = new BrowserControlManager();
const mcpManager = new McpRemoteManager({
    clientName: 'chubby-cat',
    clientVersion: chrome.runtime.getManifest().version
});

// Initialize Modules
setupContextMenus(imageManager);
setupMessageListener(sessionManager, imageManager, controlManager, mcpManager, logManager);

// Initialize Advanced Keep-Alive (Cookie Rotation)
keepAliveManager.init();

// Listen for tab activation changes to update active tab display in UI
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab) {
            chrome.runtime.sendMessage({
                action: "ACTIVE_TAB_INFO",
                tab: {
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                    favIconUrl: tab.favIconUrl
                }
            }).catch(() => { }); // Ignore if no listener
        }
    } catch (e) {
        // Tab may have been closed or inaccessible
    }
});

// Listen for tab title/URL updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only respond if the tab's title or URL changed and it's the active tab
    if (changeInfo.title || changeInfo.url) {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (activeTab && activeTab.id === tabId) {
                chrome.runtime.sendMessage({
                    action: "ACTIVE_TAB_INFO",
                    tab: {
                        id: tab.id,
                        title: tab.title,
                        url: tab.url,
                        favIconUrl: tab.favIconUrl
                    }
                }).catch(() => { }); // Ignore if no listener
            }
        } catch (e) {
            // Ignore errors
        }
    }
});
