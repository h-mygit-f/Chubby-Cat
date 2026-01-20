
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

        // Custom dropdown elements
        this.modelDropdown = document.getElementById('model-dropdown');
        this.modelDropdownTrigger = document.getElementById('model-dropdown-trigger');
        this.modelDropdownLabel = document.getElementById('model-dropdown-label');
        this.modelDropdownMenu = document.getElementById('model-dropdown-menu');

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

        // 2. Grok Web Models
        const grokModels = [
            { val: 'grok-4', txt: 'Grok 4', provider: 'grok' },
            { val: 'grok-4.1-thinking', txt: 'Grok 4.1 Thinking', provider: 'grok' },
            { val: 'grok-4-fast', txt: 'Grok 4 Fast', provider: 'grok' },
            { val: 'grok-3-fast', txt: 'Grok 3 Fast', provider: 'grok' },
            { val: 'grok-imagine-0.9', txt: 'Grok Imagine', provider: 'grok' }
        ];

        // 3. Official API Models (from configured list or fallback defaults)
        const officialModels = [];
        const officialMeta = this._normalizeOfficialModels(settings);
        const rawOfficialModels = officialMeta.list;

        if (rawOfficialModels.length > 0) {
            rawOfficialModels.forEach(id => {
                officialModels.push({ val: id, txt: id, provider: 'official' });
            });
        } else if (settings.apiKey) {
            officialModels.push(
                { val: 'gemini-3-flash-preview', txt: 'Gemini 3 Flash', provider: 'official' },
                { val: 'gemini-3-pro-preview', txt: 'Gemini 3 Pro', provider: 'official' }
            );
        }

        // 4. OpenAI Compatible Configs
        const openaiModels = [];
        const configs = Array.isArray(settings.openaiConfigs) ? settings.openaiConfigs : [];
        if (configs.length > 0) {
            configs.forEach(c => {
                if (!c || (!c.baseUrl && !c.apiKey)) return;
                const label = (c.name || c.baseUrl || 'Unnamed Config').trim();
                const models = this._normalizeOpenaiModels(c);
                if (models.length > 0) {
                    models.forEach(modelId => {
                        openaiModels.push({
                            val: this._buildOpenaiModelValue(c.id, modelId),
                            txt: `${label} - ${modelId}`,
                            provider: 'openai',
                            isConfig: true,
                            configId: c.id,
                            modelId: modelId
                        });
                    });
                } else {
                    openaiModels.push({
                        val: c.id,
                        txt: label,
                        provider: 'openai',
                        isConfig: true,
                        configId: c.id,
                        modelId: ''
                    });
                }
            });
        }

        // --- Render Hidden Select Options (for compatibility) ---

        // Add Web models (always first, always available)
        if (webModels.length > 0) {
            const webGroup = document.createElement('optgroup');
            webGroup.label = 'Web (Free)';
            webModels.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.txt;
                opt.dataset.provider = 'web';
                webGroup.appendChild(opt);
            });
            this.modelSelect.appendChild(webGroup);
        }

        // Add Grok models
        if (grokModels.length > 0) {
            const grokGroup = document.createElement('optgroup');
            grokGroup.label = 'Grok (Free)';
            grokModels.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.txt;
                opt.dataset.provider = 'grok';
                grokGroup.appendChild(opt);
            });
            this.modelSelect.appendChild(grokGroup);
        }

        // Add Official API models (if configured)
        if (officialModels.length > 0) {
            const officialGroup = document.createElement('optgroup');
            officialGroup.label = 'Official API';
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
            openaiGroup.label = 'Custom API';
            openaiModels.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.txt;
                opt.dataset.provider = 'openai';
                opt.dataset.isConfig = 'true';
                opt.dataset.configId = o.configId;
                if (o.modelId) opt.dataset.modelId = o.modelId;
                openaiGroup.appendChild(opt);
            });
            this.modelSelect.appendChild(openaiGroup);
        }

        // --- Render Custom Dropdown Menu ---
        this._renderDropdownMenu(webModels, grokModels, officialModels, openaiModels, current);

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

        if (!restored && current && current.startsWith('cfg_') && openaiModels.length > 0) {
            const match = openaiModels.find(m => m.configId === current);
            if (match) {
                this.modelSelect.value = match.val;
                restored = true;
            }
        }

        // If not restored, select appropriate default based on current provider
        if (!restored) {
            let defaultValue = null;

            if (currentProvider === 'openai' && openaiModels.length > 0) {
                const activeConfig = configs.find(c => c.id === settings.openaiActiveConfigId) || configs[0];
                if (activeConfig) {
                    const activeModel = activeConfig.activeModelId
                        || activeConfig.model
                        || this._normalizeOpenaiModels(activeConfig)[0]
                        || '';
                    const desiredValue = this._buildOpenaiModelValue(activeConfig.id, activeModel);
                    if (desiredValue && openaiModels.some(m => m.val === desiredValue)) {
                        defaultValue = desiredValue;
                    } else {
                        const fallback = openaiModels.find(m => m.configId === activeConfig.id);
                        defaultValue = fallback ? fallback.val : openaiModels[0].val;
                    }
                } else {
                    defaultValue = openaiModels[0].val;
                }
            } else if (currentProvider === 'grok' && grokModels.length > 0) {
                defaultValue = grokModels[0].val;
            } else if (currentProvider === 'official' && officialModels.length > 0) {
                const preferred = officialMeta.active
                    && officialModels.some(m => m.val === officialMeta.active)
                    ? officialMeta.active
                    : officialModels[0].val;
                defaultValue = preferred;
            } else if (webModels.length > 0) {
                defaultValue = webModels[0].val;
            }

            if (defaultValue) {
                this.modelSelect.value = defaultValue;
            }
        }

        this._syncDropdownSelection();
    }

    /**
     * Render custom dropdown menu with groups and heart icons
     */
    _renderDropdownMenu(webModels, grokModels, officialModels, openaiModels, selectedValue) {
        if (!this.modelDropdownMenu) return;

        const heartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

        let html = '';

        const renderOption = (model) => {
            const isSelected = model.val === selectedValue;
            const configAttrs = model.isConfig ? `data-is-config="true" data-config-id="${model.configId}"` : '';
            const modelAttrs = model.modelId ? `data-model-id="${model.modelId}"` : '';
            return `
                <div class="model-dropdown-option${isSelected ? ' selected' : ''}"
                     data-value="${model.val}"
                     data-provider="${model.provider}"
                     ${configAttrs}
                     ${modelAttrs}>
                    <span class="model-dropdown-option-label">${model.txt}</span>
                    <span class="model-dropdown-option-icon">${heartSvg}</span>
                </div>
            `;
        };

        // Web models
        if (webModels.length > 0) {
            html += `<div class="model-dropdown-group">Web (Free)</div>`;
            webModels.forEach(m => { html += renderOption(m); });
        }

        // Grok models
        if (grokModels.length > 0) {
            html += `<div class="model-dropdown-group">Grok (Free)</div>`;
            grokModels.forEach(m => { html += renderOption(m); });
        }

        // Official API models
        if (officialModels.length > 0) {
            html += `<div class="model-dropdown-group">Official API</div>`;
            officialModels.forEach(m => { html += renderOption(m); });
        }

        // OpenAI configs
        if (openaiModels.length > 0) {
            html += `<div class="model-dropdown-group">Custom API</div>`;
            openaiModels.forEach(m => { html += renderOption(m); });
        }

        this.modelDropdownMenu.innerHTML = html;
    }

    /**
     * Sync dropdown UI with hidden select value
     */
    _syncDropdownSelection() {
        if (!this.modelSelect || !this.modelDropdownMenu || !this.modelDropdownLabel) return;

        const selectedValue = this.modelSelect.value;
        const selectedOption = this.modelSelect.options[this.modelSelect.selectedIndex];
        const selectedText = selectedOption ? selectedOption.text : '';

        // Update trigger label
        this.modelDropdownLabel.textContent = selectedText;

        // Update dropdown menu selection
        const options = this.modelDropdownMenu.querySelectorAll('.model-dropdown-option');
        options.forEach(opt => {
            if (opt.dataset.value === selectedValue) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    _buildOpenaiModelValue(configId, modelId) {
        if (!configId) return modelId || '';
        if (!modelId) return configId;
        return `${configId}::${modelId}`;
    }

    _normalizeOfficialModels(settings) {
        const models = [];
        const pushModel = (val) => {
            if (!val) return;
            const trimmed = String(val).trim();
            if (!trimmed || models.includes(trimmed)) return;
            models.push(trimmed);
        };

        if (settings && Array.isArray(settings.officialModels)) {
            settings.officialModels.forEach(m => {
                if (typeof m === 'string') return pushModel(m);
                if (m && typeof m === 'object') return pushModel(m.id || m.name || m.value || '');
            });
        }

        if (settings && typeof settings.officialModel === 'string') {
            settings.officialModel.split(',').map(m => m.trim()).forEach(pushModel);
        }

        const active = settings && settings.officialActiveModelId
            ? String(settings.officialActiveModelId).trim()
            : '';
        if (active && !models.includes(active)) {
            models.unshift(active);
        }

        return { list: models, active };
    }

    _normalizeOpenaiModels(config) {
        if (!config) return [];
        const models = [];
        const pushModel = (val) => {
            if (!val) return;
            const trimmed = String(val).trim();
            if (!trimmed || models.includes(trimmed)) return;
            models.push(trimmed);
        };

        if (Array.isArray(config.models)) {
            config.models.forEach(m => {
                if (typeof m === 'string') return pushModel(m);
                if (m && typeof m === 'object') return pushModel(m.id || m.name || m.value || '');
            });
        }

        if (typeof config.model === 'string') {
            config.model.split(',').map(m => m.trim()).forEach(pushModel);
        }

        if (config.activeModelId) pushModel(config.activeModelId);

        return models;
    }

    _applyOpenaiSelection(configId, modelId) {
        if (!this._currentSettings) return false;
        const configs = this._currentSettings.openaiConfigs || [];
        const target = configs.find(c => c.id === configId);
        if (!target) return false;

        const models = this._normalizeOpenaiModels(target);
        if (modelId && !models.includes(modelId)) {
            models.push(modelId);
        }

        const nextActive = modelId || target.activeModelId || models[0] || '';
        target.models = models;
        target.activeModelId = nextActive;
        target.model = nextActive || target.model || '';

        this._currentSettings.openaiActiveConfigId = configId;
        this._currentSettings.openaiBaseUrl = target.baseUrl || '';
        this._currentSettings.openaiApiKey = target.apiKey || '';
        this._currentSettings.openaiModel = target.model || '';

        return true;
    }

    _applyOfficialSelection(modelId) {
        if (!this._currentSettings) return false;
        const meta = this._normalizeOfficialModels(this._currentSettings);
        const models = Array.isArray(meta.list) ? [...meta.list] : [];
        if (modelId && !models.includes(modelId)) {
            models.push(modelId);
        }
        const nextActive = modelId || meta.active || models[0] || '';
        this._currentSettings.officialModels = models;
        this._currentSettings.officialActiveModelId = nextActive;
        this._currentSettings.officialModel = models.length > 0 ? models.join(', ') : '';
        return true;
    }

    /**
     * Select a model from dropdown (called from event handler)
     */
    selectModelFromDropdown(value, provider, isConfig, configId, modelId) {
        if (!this.modelSelect) return;

        this.modelSelect.value = value;
        this._syncDropdownSelection();

        // Return the selection info for event handler to process
        return {
            value,
            provider,
            isConfig,
            configId,
            modelId
        };
    }

    /**
     * Handle provider switch when selecting a model from a different provider group
     * @param {string} newProvider - The new provider ('web', 'grok', 'official', 'openai')
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
            this._applyOpenaiSelection(options.configId, options.modelId || '');
        }

        // Save to storage
        saveConnectionSettingsToStorage(this._currentSettings);

        // Update settings controller state
        this.settings.updateConnectionSettings(this._currentSettings);

        this._syncDropdownSelection();

        return true;
    }

    /**
     * Handle OpenAI config quick-switch from dropdown (same provider)
     */
    handleOpenaiConfigSwitch(configId, modelId = '') {
        if (!this._currentSettings) return;

        const applied = this._applyOpenaiSelection(configId, modelId);
        if (!applied) return;

        // Ensure provider is OpenAI
        this._currentSettings.provider = 'openai';

        // Save to storage
        saveConnectionSettingsToStorage(this._currentSettings);

        // Update settings controller state
        this.settings.updateConnectionSettings(this._currentSettings);

        this._syncDropdownSelection();
    }

    /**
     * Handle Official API model switch from dropdown
     */
    handleOfficialModelSwitch(modelId = '') {
        if (!this._currentSettings) return;
        const applied = this._applyOfficialSelection(modelId);
        if (!applied) return;

        this._currentSettings.provider = 'official';

        saveConnectionSettingsToStorage(this._currentSettings);
        this.settings.updateConnectionSettings(this._currentSettings);
        this._syncDropdownSelection();
    }

    /**
     * Get the current provider from settings
     */
    getCurrentProvider() {
        if (!this._currentSettings) return 'web';
        return this._currentSettings.provider || 'web';
    }

    /**
     * Toggle dropdown menu open/close
     */
    toggleDropdown(forceClose = false) {
        if (!this.modelDropdown) return;

        if (forceClose || this.modelDropdown.classList.contains('open')) {
            this.modelDropdown.classList.remove('open');
        } else {
            this.modelDropdown.classList.add('open');
        }
    }

    /**
     * Check if dropdown is open
     */
    isDropdownOpen() {
        return this.modelDropdown?.classList.contains('open') || false;
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
