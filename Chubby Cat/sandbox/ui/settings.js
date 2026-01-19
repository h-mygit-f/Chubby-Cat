
// sandbox/ui/settings.js
import { saveShortcutsToStorage, saveThemeToStorage, requestThemeFromStorage, saveLanguageToStorage, requestLanguageFromStorage, saveTextSelectionToStorage, requestTextSelectionFromStorage, saveSidebarBehaviorToStorage, saveImageToolsToStorage, requestImageToolsFromStorage, saveAccountIndicesToStorage, requestAccountIndicesFromStorage, saveConnectionSettingsToStorage, requestConnectionSettingsFromStorage, saveSummaryPromptToStorage, requestSummaryPromptFromStorage, sendToBackground } from '../../lib/messaging.js';
import { setLanguagePreference, getLanguagePreference } from '../core/i18n.js';
import { SettingsView } from './settings/view.js';
import { DEFAULT_SHORTCUTS } from '../../lib/constants.js';

export class SettingsController {
    constructor(callbacks) {
        this.callbacks = callbacks || {};

        // State
        this.defaultShortcuts = { ...DEFAULT_SHORTCUTS };
        this.shortcuts = { ...this.defaultShortcuts };

        this.textSelectionEnabled = true;
        this.imageToolsEnabled = true;
        this.accountIndices = "0";

        // Connection State
        this.connectionData = {
            provider: 'web',
            useOfficialApi: false, // Legacy support
            officialBaseUrl: '',
            apiKey: "",
            thinkingLevel: "low",
            openaiBaseUrl: "",
            openaiApiKey: "",
            openaiModel: "",
            // OpenAI Multi-Config
            openaiConfigs: [],
            openaiActiveConfigId: null,
            // MCP (External Tools)
            mcpEnabled: false,
            mcpTransport: "sse",
            mcpServerUrl: "http://127.0.0.1:3006/sse",
            mcpServers: [{
                id: `srv_${Date.now()}`,
                name: "Local Proxy",
                transport: "sse",
                url: "http://127.0.0.1:3006/sse",
                enabled: true,
                toolMode: "all",
                enabledTools: []
            }],
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
            onDownloadLogs: () => this.downloadLogs(),
            onExport: () => this.handleExport(),
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

    handleOpen() {
        // Sync state to view
        this.view.setShortcuts(this.shortcuts);
        this.view.setLanguageValue(getLanguagePreference());
        this.view.setAccountIndices(this.accountIndices);
        this.view.setConnectionSettings(this.connectionData);
        this._syncTogglesToView();

        // Refresh from storage
        requestTextSelectionFromStorage();
        requestImageToolsFromStorage();
        requestAccountIndicesFromStorage();
        requestConnectionSettingsFromStorage();
        requestSummaryPromptFromStorage();

        this.fetchGithubData();
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

        // Connection
        this.connectionData = {
            provider: data.connection.provider,
            officialBaseUrl: data.connection.officialBaseUrl || '',
            apiKey: data.connection.apiKey,
            thinkingLevel: data.connection.thinkingLevel,
            openaiBaseUrl: data.connection.openaiBaseUrl,
            openaiApiKey: data.connection.openaiApiKey,
            openaiModel: data.connection.openaiModel,
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
        }
    }

    updateTextSelection(enabled) {
        this.textSelectionEnabled = enabled;
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
    }

    updateImageTools(enabled) {
        this.imageToolsEnabled = enabled;
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
    }

    updateConnectionSettings(settings) {
        this.connectionData = { ...this.connectionData, ...settings };

        // Legacy compat: If provider missing but useOfficialApi is true, set to official
        if (!this.connectionData.provider) {
            if (settings.useOfficialApi) this.connectionData.provider = 'official';
            else this.connectionData.provider = 'web';
        }

        this.view.setConnectionSettings(this.connectionData);
        this._syncTogglesToView();
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
    }

    updateSummaryPrompt(prompt) {
        this.view.setSummaryPrompt(prompt || '');
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

    handleExport() {
        try {
            const configs = this.connectionData.openaiConfigs || [];

            if (configs.length === 0) {
                this.view.setExportResult(false, 'No configurations to export');
                return;
            }

            const exportData = {
                exportedFrom: 'chubby-cat',
                version: '1.0',
                exportedAt: new Date().toISOString(),
                openaiConfigs: configs,
                openaiActiveConfigId: this.connectionData.openaiActiveConfigId || null,
                mcpServers: this.connectionData.mcpServers || [],
                mcpActiveServerId: this.connectionData.mcpActiveServerId || null
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `chubby-cat-configs-${timestamp}.json`;

            // Trigger download via parent frame - send text content instead of blob URL
            // (Blob URLs created in sandbox cannot be accessed by sidepanel due to different origins)
            window.parent.postMessage({
                action: 'DOWNLOAD_EXPORT_TEXT',
                payload: {
                    text: jsonString,
                    filename: filename
                }
            }, '*');

            // Log export action
            console.log(`[Chubby Cat] Exported ${configs.length} configuration(s) to ${filename}`);

            this.view.setExportResult(true, `Exported ${configs.length} configuration(s) successfully`);

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

            const importedConfigs = data.openaiConfigs;
            let existingConfigs = this.connectionData.openaiConfigs || [];
            let finalConfigs;
            let message;

            if (mode === 'replace') {
                // Replace mode: overwrite all existing configs
                finalConfigs = importedConfigs.map(cfg => ({
                    ...cfg,
                    id: cfg.id || this._generateConfigId()
                }));
                message = `Replaced with ${finalConfigs.length} configuration(s)`;

            } else {
                // Merge mode: keep existing, add non-duplicates
                const existingIds = new Set(existingConfigs.map(c => c.id));
                const existingUrls = new Set(existingConfigs.map(c =>
                    `${c.baseUrl || ''}|${c.model || ''}`
                ));

                const newConfigs = [];
                const skipped = [];

                for (const cfg of importedConfigs) {
                    const key = `${cfg.baseUrl || ''}|${cfg.model || ''}`;

                    // Skip if same ID or same baseUrl+model exists
                    if (existingIds.has(cfg.id) || existingUrls.has(key)) {
                        skipped.push(cfg.name || 'Unnamed');
                        continue;
                    }

                    // Assign new ID to avoid conflicts
                    newConfigs.push({
                        ...cfg,
                        id: this._generateConfigId(),
                        isDefault: false // Don't override default
                    });
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

            // Set active config if none exists
            if (!this.connectionData.openaiActiveConfigId && finalConfigs.length > 0) {
                this.connectionData.openaiActiveConfigId = finalConfigs[0].id;
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
