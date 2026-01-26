
// sandbox/ui/settings.js
import { saveShortcutsToStorage, saveThemeToStorage, requestThemeFromStorage, saveLanguageToStorage, requestLanguageFromStorage, saveTextSelectionToStorage, requestTextSelectionFromStorage, saveSidebarBehaviorToStorage, saveImageToolsToStorage, requestImageToolsFromStorage, saveAccountIndicesToStorage, requestAccountIndicesFromStorage, saveConnectionSettingsToStorage, requestConnectionSettingsFromStorage, saveSummaryPromptToStorage, requestSummaryPromptFromStorage, saveFloatingToolSettingsToStorage, requestFloatingToolSettingsFromStorage, sendToBackground } from '../../lib/messaging.js';
import { setLanguagePreference, getLanguagePreference } from '../core/i18n.js';
import { SettingsView } from './settings/view.js';
import { DEFAULT_SHORTCUTS, DEFAULT_MCP_SERVERS } from '../../lib/constants.js';

const buildDefaultMcpServers = () => {
    const seed = Date.now();
    return DEFAULT_MCP_SERVERS.map((server, index) => ({
        id: `srv_${seed}_${index}_${Math.random().toString(16).slice(2)}`,
        ...server
    }));
};

export class SettingsController {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.sessionManager = null; // Will be set by app_controller

        // State
        this.defaultShortcuts = { ...DEFAULT_SHORTCUTS };
        this.shortcuts = { ...this.defaultShortcuts };

        this.textSelectionEnabled = true;
        this.imageToolsEnabled = true;
        this.accountIndices = "0";
        this.floatingToolEnabled = true;
        this.floatingToolAction = "summary";

        const defaultMcpServers = buildDefaultMcpServers();

        // Connection State
        this.connectionData = {
            provider: 'web',
            useOfficialApi: false, // Legacy support
            officialBaseUrl: '',
            apiKey: "",
            thinkingLevel: "low",
            officialModel: "",
            officialModels: [],
            officialActiveModelId: "",
            openaiBaseUrl: "",
            openaiApiKey: "",
            openaiModel: "",
            // Document Processing (OCR)
            docProcessingEnabled: false,
            docProcessingProvider: 'mistral',
            docProcessingBaseUrl: 'https://api.mistral.ai/v1/ocr',
            docProcessingApiKey: '',
            docProcessingModel: 'mistral-ocr-latest',
            // OpenAI Multi-Config
            openaiConfigs: [],
            openaiActiveConfigId: null,
            // MCP (External Tools)
            mcpEnabled: false,
            mcpTransport: "sse",
            mcpServerUrl: "http://127.0.0.1:3006/sse",
            mcpServers: defaultMcpServers,
            mcpActiveServerId: null,
            mcpActiveServerIds: [] // Multi-select support
        };

        // Initialize View
        this.view = new SettingsView({
            onOpen: () => this.handleOpen(),
            onSave: (data) => this.saveSettings(data),
            onReset: () => this.resetSettings(),

            onThemeChange: (theme) => this.setTheme(theme),
            onLanguageChange: (lang) => this.setLanguage(lang),

            onTextSelectionChange: (val) => {
                this.textSelectionEnabled = (val === 'on' || val === true);
                this.view.syncTogglesToOpenaiConfig(this.textSelectionEnabled, this.imageToolsEnabled);
                saveTextSelectionToStorage(this.textSelectionEnabled);
            },
            onImageToolsChange: (val) => {
                this.imageToolsEnabled = (val === 'on' || val === true);
                this.view.syncTogglesToOpenaiConfig(this.textSelectionEnabled, this.imageToolsEnabled);
                saveImageToolsToStorage(this.imageToolsEnabled);
            },
            onSidebarBehaviorChange: (val) => saveSidebarBehaviorToStorage(val),
            onSummaryPromptChange: (val) => saveSummaryPromptToStorage(val),
            onFloatingToolSettingsChange: (settings) => {
                const nextEnabled = settings && settings.enabled !== false;
                const nextAction = settings && settings.action === 'open_sidebar' ? 'open_sidebar' : 'summary';
                this.floatingToolEnabled = nextEnabled;
                this.floatingToolAction = nextAction;
                saveFloatingToolSettingsToStorage({ enabled: nextEnabled, action: nextAction });
            },
            onDownloadLogs: () => this.downloadLogs(),
            onExport: (options) => this.handleExport(options),
            onImport: (payload) => this.handleImport(payload)
        });

        // External Trigger Binding (supports multiple settings buttons)
        const settingsBtnIds = ['settings-btn', 'right-settings-btn'];
        settingsBtnIds.forEach(id => {
            const trigger = document.getElementById(id);
            if (trigger) {
                trigger.addEventListener('click', () => {
                    this.open();
                    if (this.callbacks.onOpen) this.callbacks.onOpen();
                });
            }
        });

        // Listen for log data
        window.addEventListener('message', (e) => {
            if (e.data.action === 'BACKGROUND_MESSAGE' && e.data.payload && e.data.payload.logs) {
                this.saveLogFile(e.data.payload.logs);
            }
        });
    }

    open() {
        this.view.open();
    }

    close() {
        this.view.close();
    }

    setSessionManager(sessionManager) {
        this.sessionManager = sessionManager;
    }

    handleOpen() {
        // Sync state to view
        this.view.setShortcuts(this.shortcuts);
        this.view.setLanguageValue(getLanguagePreference());
        this.view.setAccountIndices(this.accountIndices);
        this.view.setConnectionSettings(this.connectionData);
        this.view.setFloatingToolSettings({
            enabled: this.floatingToolEnabled,
            action: this.floatingToolAction
        });
        this._syncTogglesToView();

        // Refresh from storage
        requestTextSelectionFromStorage();
        requestImageToolsFromStorage();
        requestAccountIndicesFromStorage();
        requestConnectionSettingsFromStorage();
        requestSummaryPromptFromStorage();
        requestFloatingToolSettingsFromStorage();

        this.fetchGithubData();
        this._refreshDirtyBaseline();
    }

    _syncTogglesToView() {
        if (this.connectionData.provider === 'openai') {
            const toggles = this.view.connection.getActiveOpenaiToggles();
            if (toggles) {
                this.view.setToggles(toggles.textSelectionEnabled, toggles.imageToolsEnabled);
                return;
            }
        }
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
    }

    _refreshDirtyBaseline() {
        if (this.view && typeof this.view.refreshDirtyBaseline === 'function') {
            this.view.refreshDirtyBaseline();
        }
    }

    saveSettings(data) {
        // Shortcuts
        this.shortcuts = data.shortcuts;
        saveShortcutsToStorage(this.shortcuts);

        // General Toggles
        this.textSelectionEnabled = data.textSelection;
        saveTextSelectionToStorage(this.textSelectionEnabled);

        this.imageToolsEnabled = data.imageTools;
        saveImageToolsToStorage(this.imageToolsEnabled);

        // Accounts
        let val = data.accountIndices.trim();
        if (!val) val = "0";
        this.accountIndices = val;
        const cleaned = val.replace(/[^0-9,]/g, '');
        saveAccountIndicesToStorage(cleaned);

        if (data.floatingTool) {
            const nextEnabled = data.floatingTool.enabled !== false;
            const nextAction = data.floatingTool.action === 'open_sidebar' ? 'open_sidebar' : 'summary';
            this.floatingToolEnabled = nextEnabled;
            this.floatingToolAction = nextAction;
            saveFloatingToolSettingsToStorage({ enabled: nextEnabled, action: nextAction });
        }

        // Connection
        this.connectionData = {
            provider: data.connection.provider,
            officialBaseUrl: data.connection.officialBaseUrl || '',
            apiKey: data.connection.apiKey,
            thinkingLevel: data.connection.thinkingLevel,
            officialModel: data.connection.officialModel || '',
            officialModels: Array.isArray(data.connection.officialModels) ? data.connection.officialModels : [],
            officialActiveModelId: data.connection.officialActiveModelId || '',
            openaiBaseUrl: data.connection.openaiBaseUrl,
            openaiApiKey: data.connection.openaiApiKey,
            openaiModel: data.connection.openaiModel,
            // Document Processing (OCR)
            docProcessingEnabled: data.connection.docProcessingEnabled === true,
            docProcessingProvider: data.connection.docProcessingProvider || 'mistral',
            docProcessingBaseUrl: data.connection.docProcessingBaseUrl || 'https://api.mistral.ai/v1/ocr',
            docProcessingApiKey: data.connection.docProcessingApiKey || '',
            docProcessingModel: data.connection.docProcessingModel || 'mistral-ocr-latest',
            // OpenAI Multi-Config
            openaiConfigs: Array.isArray(data.connection.openaiConfigs) ? data.connection.openaiConfigs : [],
            openaiActiveConfigId: data.connection.openaiActiveConfigId || null,
            // MCP
            mcpEnabled: data.connection.mcpEnabled === true,
            mcpTransport: data.connection.mcpTransport || "sse",
            mcpServerUrl: data.connection.mcpServerUrl || "",
            mcpServers: Array.isArray(data.connection.mcpServers) ? data.connection.mcpServers : [],
            mcpActiveServerId: data.connection.mcpActiveServerId || null,
            // MCP Multi-Select support
            mcpActiveServerIds: Array.isArray(data.connection.mcpActiveServerIds) ? data.connection.mcpActiveServerIds : []
        };

        saveConnectionSettingsToStorage(this.connectionData);

        // Dispatch event for MCP button state sync
        document.dispatchEvent(new CustomEvent('mcp-settings-changed', {
            detail: { mcpEnabled: this.connectionData.mcpEnabled }
        }));

        // Notify app of critical setting changes
        if (this.callbacks.onSettingsChanged) {
            this.callbacks.onSettingsChanged(this.connectionData);
        }
    }

    resetSettings() {
        this.view.setShortcuts(this.defaultShortcuts);
        this.view.setAccountIndices("0");
    }

    downloadLogs() {
        sendToBackground({ action: 'GET_LOGS' });
    }

    saveLogFile(logs) {
        if (!logs || logs.length === 0) {
            alert("No logs to download.");
            return;
        }

        const text = logs.map(l => {
            const time = new Date(l.timestamp).toISOString();
            const dataStr = l.data ? ` | Data: ${JSON.stringify(l.data)}` : '';
            return `[${time}] [${l.level}] [${l.context}] ${l.message}${dataStr}`;
        }).join('\n');

        // Send to parent to handle download (Sandbox restriction workaround)
        window.parent.postMessage({
            action: 'DOWNLOAD_LOGS',
            payload: {
                text: text,
                filename: `chubby-cat-logs-${Date.now()}.txt`
            }
        }, '*');
    }

    // --- State Updates (From View or Storage) ---

    setTheme(theme) {
        this.view.applyVisualTheme(theme);
        saveThemeToStorage(theme);
    }

    updateTheme(theme) {
        this.view.setThemeValue(theme);
    }

    setLanguage(newLang) {
        setLanguagePreference(newLang);
        saveLanguageToStorage(newLang);
        document.dispatchEvent(new CustomEvent('gemini-language-changed'));
    }

    updateLanguage(lang) {
        setLanguagePreference(lang);
        this.view.setLanguageValue(lang);
        document.dispatchEvent(new CustomEvent('gemini-language-changed'));
    }

    updateShortcuts(payload) {
        if (payload) {
            this.shortcuts = { ...this.defaultShortcuts, ...payload };
            this.view.setShortcuts(this.shortcuts);
            this._refreshDirtyBaseline();
        }
    }

    updateTextSelection(enabled) {
        this.textSelectionEnabled = enabled;
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
        this._refreshDirtyBaseline();
    }

    updateImageTools(enabled) {
        this.imageToolsEnabled = enabled;
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
        this._refreshDirtyBaseline();
    }

    updateConnectionSettings(settings) {
        const nextConnection = { ...this.connectionData, ...settings };
        if (!Array.isArray(settings.mcpServers) || settings.mcpServers.length === 0) {
            nextConnection.mcpServers = this.connectionData.mcpServers;
        }
        if (!Array.isArray(settings.mcpActiveServerIds)) {
            nextConnection.mcpActiveServerIds = this.connectionData.mcpActiveServerIds;
        }
        this.connectionData = nextConnection;

        // Legacy compat: If provider missing but useOfficialApi is true, set to official
        if (!this.connectionData.provider) {
            if (settings.useOfficialApi) this.connectionData.provider = 'official';
            else this.connectionData.provider = 'web';
        }

        this.view.setConnectionSettings(this.connectionData);
        this._syncTogglesToView();
        this._refreshDirtyBaseline();
    }

    updateMcpTestResult(result) {
        if (!this.view || !this.view.connection || typeof this.view.connection.setMcpTestStatus !== 'function') return;

        if (result && result.ok === true) {
            const count = typeof result.toolsCount === 'number' ? result.toolsCount : 0;
            this.view.connection.setMcpTestStatus(`Connected. Tools: ${count}`, false);
            return;
        }

        const err = result && result.error ? result.error : 'Connection failed';
        this.view.connection.setMcpTestStatus(`Failed: ${err}`, true);
    }

    updateMcpToolsResult(result) {
        if (!this.view || !this.view.connection || typeof this.view.connection.setMcpToolsList !== 'function') return;

        if (!result || result.ok !== true) {
            const err = result && result.error ? result.error : 'Failed to fetch tools';
            this.view.connection.setMcpTestStatus(`Failed: ${err}`, true);
            return;
        }

        this.view.connection.setMcpToolsList(
            result.serverId || null,
            result.transport || 'sse',
            result.url || '',
            Array.isArray(result.tools) ? result.tools : []
        );
    }

    updateSidebarBehavior(behavior) {
        this.view.setSidebarBehavior(behavior);
    }

    updateAccountIndices(indicesString) {
        this.accountIndices = indicesString || "0";
        this.view.setAccountIndices(this.accountIndices);
        this._refreshDirtyBaseline();
    }

    updateSummaryPrompt(prompt) {
        this.view.setSummaryPrompt(prompt || '');
        this._refreshDirtyBaseline();
    }

    updateFloatingToolSettings(settings) {
        const nextEnabled = settings && settings.enabled !== false;
        const nextAction = settings && settings.action === 'open_sidebar' ? 'open_sidebar' : 'summary';
        this.floatingToolEnabled = nextEnabled;
        this.floatingToolAction = nextAction;
        this.view.setFloatingToolSettings({ enabled: nextEnabled, action: nextAction });
        this._refreshDirtyBaseline();
    }

    async fetchGithubData() {
        if (this.view.hasFetchedStars()) return;

        try {
            const [starRes, releaseRes] = await Promise.all([
                fetch('https://api.github.com/repos/hallfay0/chubby-cat'),
                fetch('https://api.github.com/repos/hallfay0/chubby-cat/releases/latest')
            ]);

            if (starRes.ok) {
                const data = await starRes.json();
                this.view.displayStars(data.stargazers_count);
            }

            if (releaseRes.ok) {
                const data = await releaseRes.json();
                const latestVersion = data.tag_name; // e.g. "v4.2.0"
                const currentVersion = this.view.getCurrentVersion() || "v0.0.0";

                const isNewer = this.compareVersions(latestVersion, currentVersion) > 0;
                this.view.displayUpdateStatus(latestVersion, currentVersion, isNewer);
            }
        } catch (e) {
            console.warn("GitHub fetch failed", e);
            this.view.displayStars(null);
        }
    }

    compareVersions(v1, v2) {
        // Remove 'v' prefix
        const clean1 = v1.replace(/^v/, '');
        const clean2 = v2.replace(/^v/, '');

        const parts1 = clean1.split('.').map(Number);
        const parts2 = clean2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    }

    // --- Data Export/Import ---

    handleExport(options = {}) {
        try {
            const { includeChatHistory = false } = options;
            const configs = this.connectionData.openaiConfigs || [];

            const exportData = {
                exportedFrom: 'chubby-cat',
                version: '1.1',
                exportedAt: new Date().toISOString(),
                // Gemini API settings
                geminiApiKey: this.connectionData.apiKey || null,
                geminiProvider: this.connectionData.provider || 'web',
                geminiThinkingLevel: this.connectionData.thinkingLevel || 'low',
                geminiOfficialModel: this.connectionData.officialModel || null,
                geminiOfficialBaseUrl: this.connectionData.officialBaseUrl || null,
                // OpenAI compatible configs
                openaiConfigs: configs,
                openaiActiveConfigId: this.connectionData.openaiActiveConfigId || null,
                // MCP servers
                mcpServers: this.connectionData.mcpServers || [],
                mcpActiveServerId: this.connectionData.mcpActiveServerId || null
            };

            // Include chat history if requested
            if (includeChatHistory && this.sessionManager) {
                exportData.chatHistory = this.sessionManager.sessions || [];
            }

            const jsonString = JSON.stringify(exportData, null, 2);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `chubby-cat-backup-${timestamp}.json`;

            // Trigger download via parent frame
            window.parent.postMessage({
                action: 'DOWNLOAD_EXPORT_TEXT',
                payload: {
                    text: jsonString,
                    filename: filename
                }
            }, '*');

            const configCount = configs.length;
            const historyCount = includeChatHistory ? (exportData.chatHistory?.length || 0) : 0;
            let msg = `Exported ${configCount} config(s)`;
            if (includeChatHistory) msg += `, ${historyCount} chat(s)`;
            console.log(`[Chubby Cat] ${msg} to ${filename}`);
            this.view.setExportResult(true, msg);

        } catch (err) {
            console.error('[Chubby Cat] Export error:', err);
            this.view.setExportResult(false, `Export failed: ${err.message}`);
        }
    }

    handleImport(payload) {
        try {
            const { data, mode } = payload;

            if (!data || !data.openaiConfigs) {
                this.view.setImportResult(false, 'Invalid import data');
                return;
            }

            const normalizeModelList = (raw) => {
                if (!raw) return [];
                let list = [];
                if (Array.isArray(raw)) {
                    list = raw.map(item => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') return item.id || item.name || item.value || '';
                        return '';
                    });
                } else if (typeof raw === 'string') {
                    list = raw.split(',').map(m => m.trim());
                }
                const seen = new Set();
                return list.filter(m => m).filter(m => {
                    if (seen.has(m)) return false;
                    seen.add(m);
                    return true;
                });
            };

            const normalizeConfig = (cfg, options = {}) => {
                const models = normalizeModelList(cfg.models || cfg.model);
                const activeModelId = (cfg.activeModelId || '').trim() || models[0] || '';
                return {
                    ...cfg,
                    id: options.forceNewId ? this._generateConfigId() : (cfg.id || this._generateConfigId()),
                    providerType: cfg.providerType || 'openai',
                    timeout: cfg.timeout || 60000,
                    models: models,
                    activeModelId: activeModelId,
                    model: activeModelId || '',
                    isDefault: options.clearDefault ? false : (cfg.isDefault === true)
                };
            };

            const keyForConfig = (cfg) => {
                const modelsKey = normalizeModelList(cfg.models || cfg.model).join(',');
                return `${cfg.baseUrl || ''}|${modelsKey}`;
            };

            const importedConfigs = data.openaiConfigs;
            let existingConfigs = (this.connectionData.openaiConfigs || []).map(cfg => normalizeConfig(cfg));
            let finalConfigs;
            let message;

            if (mode === 'replace') {
                // Replace mode: overwrite all existing configs
                finalConfigs = importedConfigs.map(cfg => normalizeConfig(cfg));
                message = `Replaced with ${finalConfigs.length} configuration(s)`;

            } else {
                // Merge mode: keep existing, add non-duplicates
                const existingIds = new Set(existingConfigs.map(c => c.id));
                const existingKeys = new Set(existingConfigs.map(c => keyForConfig(c)));

                const newConfigs = [];
                const skipped = [];

                for (const cfg of importedConfigs) {
                    const normalized = normalizeConfig(cfg, { forceNewId: true, clearDefault: true });
                    const key = keyForConfig(normalized);

                    // Skip if same ID or same baseUrl+model exists
                    if (existingIds.has(cfg.id) || existingKeys.has(key)) {
                        skipped.push(cfg.name || 'Unnamed');
                        continue;
                    }

                    // Assign new ID to avoid conflicts
                    newConfigs.push(normalized);
                }

                // Check max config limit
                const totalAfterMerge = existingConfigs.length + newConfigs.length;
                if (totalAfterMerge > 88) {
                    const allowed = 88 - existingConfigs.length;
                    if (allowed <= 0) {
                        this.view.setImportResult(false, 'Maximum 88 configurations reached. Delete some first.');
                        return;
                    }
                    newConfigs.splice(allowed);
                    message = `Imported ${newConfigs.length} configuration(s). Limit reached.`;
                } else {
                    message = skipped.length > 0
                        ? `Imported ${newConfigs.length}, skipped ${skipped.length} duplicate(s)`
                        : `Imported ${newConfigs.length} configuration(s)`;
                }

                finalConfigs = [...existingConfigs, ...newConfigs];
            }

            // Update connection data
            this.connectionData.openaiConfigs = finalConfigs;

            const importedActiveId = data.openaiActiveConfigId;
            if (importedActiveId && finalConfigs.some(c => c.id === importedActiveId)) {
                this.connectionData.openaiActiveConfigId = importedActiveId;
            }

            const hasActiveConfig = this.connectionData.openaiActiveConfigId
                && finalConfigs.some(c => c.id === this.connectionData.openaiActiveConfigId);

            if (!hasActiveConfig && finalConfigs.length > 0) {
                this.connectionData.openaiActiveConfigId = finalConfigs[0].id;
            }

            const activeConfig = finalConfigs.find(cfg => cfg.id === this.connectionData.openaiActiveConfigId) || finalConfigs[0] || null;
            if (activeConfig) {
                const models = Array.isArray(activeConfig.models) ? activeConfig.models : [];
                const activeModel = activeConfig.activeModelId || activeConfig.model || models[0] || '';
                this.connectionData.openaiBaseUrl = activeConfig.baseUrl || '';
                this.connectionData.openaiApiKey = activeConfig.apiKey || '';
                this.connectionData.openaiModel = activeModel || '';
            }

            // Also import MCP servers if present
            if (data.mcpServers && Array.isArray(data.mcpServers)) {
                if (mode === 'replace') {
                    this.connectionData.mcpServers = data.mcpServers;
                    this.connectionData.mcpActiveServerId = data.mcpActiveServerId || null;
                } else {
                    // Merge MCP servers
                    const existingServerIds = new Set((this.connectionData.mcpServers || []).map(s => s.id));
                    const newServers = data.mcpServers.filter(s => !existingServerIds.has(s.id));
                    this.connectionData.mcpServers = [
                        ...(this.connectionData.mcpServers || []),
                        ...newServers
                    ];
                }
            }

            // Save to storage
            saveConnectionSettingsToStorage(this.connectionData);

            // Update view
            this.view.setConnectionSettings(this.connectionData);

            // Log import action
            console.log(`[Chubby Cat] ${message}`);

            this.view.setImportResult(true, message);

            // Notify app of setting changes
            if (this.callbacks.onSettingsChanged) {
                this.callbacks.onSettingsChanged(this.connectionData);
            }

        } catch (err) {
            console.error('[Chubby Cat] Import error:', err);
            this.view.setImportResult(false, `Import failed: ${err.message}`);
        }
    }

    _generateConfigId() {
        return `cfg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
}
