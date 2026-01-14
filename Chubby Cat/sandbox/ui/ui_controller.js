
// sandbox/ui/ui_controller.js
import { ChatController } from './chat.js';
import { SidebarController } from './sidebar.js';
import { SettingsController } from './settings.js';
import { ViewerController } from './viewer.js';
import { TabSelectorController } from './tab_selector.js';
import { ActiveTabController } from './active_tab.js';
import { saveConnectionSettingsToStorage } from '../../lib/messaging.js';

export class UIController {
    constructor(elements) {
        // Initialize Sub-Controllers
        this.chat = new ChatController(elements);

        this.sidebar = new SidebarController(elements, {
            onOverlayClick: () => this.settings.close()
        });

        // Settings and Viewer now self-manage their DOM
        this.settings = new SettingsController({
            onOpen: () => this.sidebar.close(),
            onSettingsChanged: (connectionSettings) => {
                this.updateModelList(connectionSettings);
            }
        });

        this.viewer = new ViewerController();

        this.tabSelector = new TabSelectorController();

        // Active Tab Controller for multi-tab context import
        this.activeTab = null; // Will be initialized after app is ready

        // Properties exposed for external use (AppController/MessageHandler)
        this.inputFn = this.chat.inputFn;
        this.historyDiv = this.chat.historyDiv;
        this.sendBtn = this.chat.sendBtn;
        this.modelSelect = elements.modelSelect;
        this.tabSwitcherBtn = document.getElementById('tab-switcher-btn');

        // Initialize Layout Detection
        this.checkLayout();
        window.addEventListener('resize', () => this.checkLayout());
    }

    checkLayout() {
        // Threshold for Wide Mode (e.g. Full Page Tab or large side panel)
        const isWide = window.innerWidth > 800;
        if (isWide) {
            document.body.classList.add('layout-wide');
        } else {
            document.body.classList.remove('layout-wide');
        }
    }

    // --- Dynamic Model List ---
    // Now supports cross-provider model switching with grouped display

    updateModelList(settings) {
        if (!this.modelSelect) return;

        // Store settings reference for provider switching
        this._currentSettings = { ...settings };

        const current = this.modelSelect.value;
        const currentProvider = settings.provider || (settings.useOfficialApi ? 'official' : 'web');

        this.modelSelect.innerHTML = '';

        // --- Build all provider options ---

        // 1. Web Client Models (Always available, no API key needed)
        const webModels = [
            { val: 'gemini-3-flash', txt: 'Fast', provider: 'web' },
            { val: 'gemini-3-flash-thinking', txt: 'Thinking', provider: 'web' },
            { val: 'gemini-3-pro', txt: '3 Pro', provider: 'web' }
        ];

        // 2. Official API Models (if API key is configured)
        const officialModels = [];
        if (settings.apiKey) {
            officialModels.push(
                { val: 'gemini-3-flash-preview', txt: 'Gemini 3 Flash', provider: 'official' },
                { val: 'gemini-3-pro-preview', txt: 'Gemini 3 Pro', provider: 'official' }
            );
        }

        // 3. OpenAI Compatible Configs
        const openaiModels = [];
        const configs = Array.isArray(settings.openaiConfigs) ? settings.openaiConfigs : [];
        if (configs.length > 0) {
            configs.forEach(c => {
                // Only add configs that have at least baseUrl or apiKey configured
                if (c.baseUrl || c.apiKey) {
                    openaiModels.push({
                        val: c.id,
                        txt: c.name || c.model || 'Unnamed Config',
                        provider: 'openai',
                        isConfig: true,
                        configId: c.id
                    });
                }
            });
        }

        // --- Render Options with Grouping ---

        // Helper to add options
        const addOptions = (opts, providerType) => {
            opts.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.txt;
                opt.dataset.provider = o.provider;
                if (o.isConfig) {
                    opt.dataset.isConfig = 'true';
                    opt.dataset.configId = o.configId;
                }
                this.modelSelect.appendChild(opt);
            });
        };

        // Add Web models (always first, always available)
        if (webModels.length > 0) {
            const webGroup = document.createElement('optgroup');
            webGroup.label = '🌐 Web (Free)';
            webModels.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.txt;
                opt.dataset.provider = 'web';
                webGroup.appendChild(opt);
            });
            this.modelSelect.appendChild(webGroup);
        }

        // Add Official API models (if configured)
        if (officialModels.length > 0) {
            const officialGroup = document.createElement('optgroup');
            officialGroup.label = '✨ Official API';
            officialModels.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.txt;
                opt.dataset.provider = 'official';
                officialGroup.appendChild(opt);
            });
            this.modelSelect.appendChild(officialGroup);
        }

        // Add OpenAI configs (if any)
        if (openaiModels.length > 0) {
            const openaiGroup = document.createElement('optgroup');
            openaiGroup.label = '🔧 Custom API';
            openaiModels.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.txt;
                opt.dataset.provider = 'openai';
                opt.dataset.isConfig = 'true';
                opt.dataset.configId = o.configId;
                openaiGroup.appendChild(opt);
            });
            this.modelSelect.appendChild(openaiGroup);
        }

        // --- Restore Selection ---
        // Try to restore previous selection, considering cross-provider scenarios

        let restored = false;

        // If we have a current value, try to find it
        if (current) {
            const allOptions = this.modelSelect.querySelectorAll('option');
            for (const opt of allOptions) {
                if (opt.value === current) {
                    this.modelSelect.value = current;
                    restored = true;
                    break;
                }
            }
        }

        // If not restored, select appropriate default based on current provider
        if (!restored) {
            let defaultValue = null;

            if (currentProvider === 'openai' && openaiModels.length > 0) {
                // For OpenAI, prefer the active config
                const activeId = settings.openaiActiveConfigId;
                if (activeId && openaiModels.some(m => m.val === activeId)) {
                    defaultValue = activeId;
                } else {
                    defaultValue = openaiModels[0].val;
                }
            } else if (currentProvider === 'official' && officialModels.length > 0) {
                defaultValue = officialModels[0].val;
            } else if (webModels.length > 0) {
                defaultValue = webModels[0].val;
            }

            if (defaultValue) {
                this.modelSelect.value = defaultValue;
            }
        }

        this._resizeModelSelect();
    }

    /**
     * Handle provider switch when selecting a model from a different provider group
     * @param {string} newProvider - The new provider ('web', 'official', 'openai')
     * @param {Object} options - Additional options like configId for OpenAI
     */
    handleProviderSwitch(newProvider, options = {}) {
        if (!this._currentSettings) return false;

        const oldProvider = this._currentSettings.provider || 'web';

        // If same provider, no switch needed
        if (oldProvider === newProvider && !options.configId) {
            return false;
        }

        // Update provider
        this._currentSettings.provider = newProvider;

        // Handle OpenAI config switch
        if (newProvider === 'openai' && options.configId) {
            const configs = this._currentSettings.openaiConfigs || [];
            const newActive = configs.find(c => c.id === options.configId);
            if (newActive) {
                this._currentSettings.openaiActiveConfigId = options.configId;
                // Update legacy fields for backward compatibility
                this._currentSettings.openaiBaseUrl = newActive.baseUrl || '';
                this._currentSettings.openaiApiKey = newActive.apiKey || '';
                this._currentSettings.openaiModel = newActive.model || '';
            }
        }

        // Save to storage
        saveConnectionSettingsToStorage(this._currentSettings);

        // Update settings controller state
        this.settings.updateConnectionSettings(this._currentSettings);

        this._resizeModelSelect();

        return true;
    }

    /**
     * Handle OpenAI config quick-switch from dropdown (same provider)
     */
    handleOpenaiConfigSwitch(configId) {
        if (!this._currentSettings) return;

        const configs = this._currentSettings.openaiConfigs || [];
        const newActive = configs.find(c => c.id === configId);
        if (!newActive) return;

        // Update active config ID
        this._currentSettings.openaiActiveConfigId = configId;

        // Update legacy fields for backward compatibility
        this._currentSettings.openaiBaseUrl = newActive.baseUrl || '';
        this._currentSettings.openaiApiKey = newActive.apiKey || '';
        this._currentSettings.openaiModel = newActive.model || '';

        // Ensure provider is OpenAI
        this._currentSettings.provider = 'openai';

        // Save to storage
        saveConnectionSettingsToStorage(this._currentSettings);

        // Update settings controller state
        this.settings.updateConnectionSettings(this._currentSettings);

        this._resizeModelSelect();
    }

    /**
     * Get the current provider from settings
     */
    getCurrentProvider() {
        if (!this._currentSettings) return 'web';
        return this._currentSettings.provider || 'web';
    }

    _resizeModelSelect() {
        const select = this.modelSelect;
        if (!select) return;

        // Safety check for empty or invalid selection
        if (select.selectedIndex === -1) {
            if (select.options.length > 0) select.selectedIndex = 0;
            else return; // Should not happen if options exist
        }

        const tempSpan = document.createElement('span');
        Object.assign(tempSpan.style, {
            visibility: 'hidden',
            position: 'absolute',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: window.getComputedStyle(select).fontFamily,
            whiteSpace: 'nowrap'
        });
        tempSpan.textContent = select.options[select.selectedIndex].text;
        document.body.appendChild(tempSpan);
        const width = tempSpan.getBoundingClientRect().width;
        document.body.removeChild(tempSpan);
        select.style.width = `${width + 34}px`;
    }

    // --- Delegation Methods ---

    // Chat / Input
    updateStatus(text) { this.chat.updateStatus(text); }
    clearChatHistory() { this.chat.clear(); }
    scrollToBottom() { this.chat.scrollToBottom(); }
    resetInput() { this.chat.resetInput(); }
    setLoading(isLoading) { this.chat.setLoading(isLoading); }

    // Sidebar
    toggleSidebar() { this.sidebar.toggle(); }
    closeSidebar() { this.sidebar.close(); }
    renderHistoryList(sessions, currentId, callbacks) {
        this.sidebar.renderList(sessions, currentId, callbacks);
    }

    // Settings
    updateShortcuts(payload) { this.settings.updateShortcuts(payload); }
    updateTheme(theme) { this.settings.updateTheme(theme); }
    updateLanguage(lang) { this.settings.updateLanguage(lang); }

    // Tab Selector
    openTabSelector(tabs, onSelect, lockedTabId) {
        this.tabSelector.open(tabs, onSelect, lockedTabId);
    }

    toggleTabSwitcher(show) {
        if (this.tabSwitcherBtn) {
            this.tabSwitcherBtn.style.display = show ? 'flex' : 'none';
        }
    }

    // Active Tab Controller
    initActiveTabController(callbacks) {
        this.activeTab = new ActiveTabController(callbacks);
    }

    updateActiveTabInfo(tab) {
        if (this.activeTab) {
            this.activeTab.updateActiveTab(tab);
        }
    }

    populateTabsForContext(tabs) {
        if (this.activeTab) {
            this.activeTab.populateTabs(tabs);
        }
    }

    onTabsImportComplete(result) {
        if (this.activeTab) {
            this.activeTab.onImportComplete(result);
        }
    }

    onTabsImportError(error) {
        if (this.activeTab) {
            this.activeTab.onImportError(error);
        }
    }

    resetActiveTabContext() {
        if (this.activeTab) {
            this.activeTab.resetContext();
        }
    }
}