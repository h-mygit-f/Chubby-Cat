
// sandbox/ui/settings/sections/connection.js
import { sendToBackground } from '../../../../lib/messaging.js';

export class ConnectionSection {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};
        // MCP state - multi-select support
        this.mcpServers = [];
        this.mcpActiveServerIds = []; // Array of active server IDs for multi-select
        this.mcpEditingServerId = null; // Currently editing server in form
        this.mcpToolsCache = new Map(); // serverId -> { key, tools }
        this.mcpToolsUiState = new Map(); // serverId -> { openGroups: Set<string> }
        // OpenAI Multi-Config state
        this.openaiConfigs = [];
        this.openaiActiveConfigId = null;
        this.queryElements();
        this.bindEvents();
    }

    _makeServerId() {
        return `srv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    _getDefaultServer() {
        return {
            id: this._makeServerId(),
            name: 'Local Proxy',
            transport: 'sse',
            url: 'http://127.0.0.1:3006/sse',
            enabled: true,
            toolMode: 'all', // 'all' | 'selected'
            enabledTools: [] // only used when toolMode === 'selected'
        };
    }

    _getDefaultUrlForTransport(transport) {
        const t = (transport || 'sse').toLowerCase();
        if (t === 'ws' || t === 'websocket') return 'ws://127.0.0.1:3006/mcp';
        if (t === 'streamable-http' || t === 'streamablehttp') return 'http://127.0.0.1:3006/mcp';
        return 'http://127.0.0.1:3006/sse';
    }

    queryElements() {
        const get = (id) => document.getElementById(id);
        this.elements = {
            providerSelect: get('provider-select'),
            apiKeyContainer: get('api-key-container'),

            // Official Fields
            officialFields: get('official-fields'),
            officialBaseUrl: get('official-base-url'),
            apiKeyInput: get('api-key-input'),
            thinkingLevelSelect: get('thinking-level-select'),
            officialModel: get('official-model'),
            officialFetchModels: get('official-fetch-models'),
            officialFetchStatus: get('official-fetch-status'),
            officialModelDropdown: get('official-model-dropdown'),

            // OpenAI Fields
            openaiFields: get('openai-fields'),
            openaiConfigSelect: get('openai-config-select'),
            openaiAddConfig: get('openai-add-config'),
            openaiRemoveConfig: get('openai-remove-config'),
            openaiConfigName: get('openai-config-name'),
            openaiProviderType: get('openai-provider-type'),
            openaiBaseUrl: get('openai-base-url'),
            openaiApiKey: get('openai-api-key'),
            openaiModel: get('openai-model'),
            openaiTimeout: get('openai-timeout'),
            openaiSetDefault: get('openai-set-default'),
            openaiConfigStatus: get('openai-config-status'),
            openaiFetchModels: get('openai-fetch-models'),
            openaiFetchStatus: get('openai-fetch-status'),
            openaiModelDropdown: get('openai-model-dropdown'),

            // Claude-specific options
            claudeOptions: get('claude-options'),
            claudeMaxTokens: get('claude-max-tokens'),
            claudeThinkingEnabled: get('claude-thinking-enabled'),
            claudeThinkingBudgetContainer: get('claude-thinking-budget-container'),
            claudeThinkingBudget: get('claude-thinking-budget'),

            // MCP Fields - multi-select support
            mcpEnabled: get('mcp-enabled'),
            mcpFields: get('mcp-fields'),
            mcpServerList: get('mcp-server-list'),
            mcpAddServer: get('mcp-add-server'),
            mcpRemoveServer: get('mcp-remove-server'),
            mcpServerName: get('mcp-server-name'),
            mcpTransport: get('mcp-transport'),
            mcpServerUrl: get('mcp-server-url'),
            mcpServerEnabled: get('mcp-server-enabled'),
            mcpTestConnection: get('mcp-test-connection'),
            mcpTestStatus: get('mcp-test-status'),
            mcpToolMode: get('mcp-tool-mode'),
            mcpRefreshTools: get('mcp-refresh-tools'),
            mcpEnableAllTools: get('mcp-enable-all-tools'),
            mcpDisableAllTools: get('mcp-disable-all-tools'),
            mcpToolSearch: get('mcp-tool-search'),
            mcpToolsSummary: get('mcp-tools-summary'),
            mcpToolList: get('mcp-tool-list'),
        };
    }

    bindEvents() {
        const { providerSelect } = this.elements;
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                this.updateVisibility(e.target.value);
                this.fire('onProviderChange', e.target.value);
            });
        }

        const { mcpEnabled } = this.elements;
        if (mcpEnabled) {
            mcpEnabled.addEventListener('change', (e) => {
                this.updateMcpVisibility(e.target.checked === true);
            });
        }

        const {
            mcpAddServer,
            mcpRemoveServer,
            mcpServerName,
            mcpTransport,
            mcpServerUrl,
            mcpServerEnabled,
            mcpTestConnection,
            mcpToolMode,
            mcpRefreshTools,
            mcpEnableAllTools,
            mcpDisableAllTools,
            mcpToolSearch
        } = this.elements;

        // Note: mcpServerList events are bound dynamically in _renderMcpServerList()

        if (mcpAddServer) {
            mcpAddServer.addEventListener('click', () => {
                this._saveCurrentServerEdits();
                const server = this._getDefaultServer();
                this.mcpServers.push(server);
                // Add to active servers by default
                this.mcpActiveServerIds.push(server.id);
                // Set as editing server
                this.mcpEditingServerId = server.id;
                this._renderMcpServerList();
                this._loadEditingServerIntoForm();
                this.setMcpTestStatus('');
            });
        }

        if (mcpRemoveServer) {
            mcpRemoveServer.addEventListener('click', () => {
                this._saveCurrentServerEdits();
                const id = this.mcpEditingServerId;
                if (!id) return;

                this.mcpServers = this.mcpServers.filter(s => s.id !== id);
                this.mcpActiveServerIds = this.mcpActiveServerIds.filter(sid => sid !== id);

                if (this.mcpServers.length === 0) {
                    const server = this._getDefaultServer();
                    server.enabled = false;
                    this.mcpServers = [server];
                }

                // Set editing to first server
                this.mcpEditingServerId = this.mcpServers[0].id;
                this._renderMcpServerList();
                this._loadEditingServerIntoForm();
                this.setMcpTestStatus('');
            });
        }

        const onEdit = () => {
            this._saveCurrentServerEdits();
            this._renderMcpServerList();
        };

        if (mcpServerName) mcpServerName.addEventListener('input', onEdit);
        if (mcpServerUrl) mcpServerUrl.addEventListener('input', onEdit);
        if (mcpTransport) {
            mcpTransport.addEventListener('change', () => {
                const server = this._getEditingServer();
                const prevTransport = server ? (server.transport || 'sse') : 'sse';
                const nextTransport = mcpTransport.value || 'sse';

                // Update placeholder to match transport.
                if (mcpServerUrl) {
                    mcpServerUrl.placeholder = this._getDefaultUrlForTransport(nextTransport);
                }

                // If URL is empty OR still equal to the previous transport default, swap to new default.
                if (server && mcpServerUrl) {
                    const currentUrl = (mcpServerUrl.value || '').trim();
                    const prevDefault = this._getDefaultUrlForTransport(prevTransport);
                    if (!currentUrl || currentUrl === prevDefault) {
                        mcpServerUrl.value = this._getDefaultUrlForTransport(nextTransport);
                    }
                }

                onEdit();
            });
        }
        if (mcpServerEnabled) mcpServerEnabled.addEventListener('change', onEdit);

        if (mcpToolMode) {
            mcpToolMode.addEventListener('change', () => {
                this._saveCurrentServerEdits();
                this._renderToolsUI();
            });
        }

        if (mcpToolSearch) {
            mcpToolSearch.addEventListener('input', () => {
                this._renderToolsUI();
            });
        }

        if (mcpRefreshTools) {
            mcpRefreshTools.addEventListener('click', () => {
                this._saveCurrentServerEdits();
                const server = this._getEditingServer();
                if (!server) return;

                this.setMcpTestStatus('Fetching tools...');
                sendToBackground({
                    action: 'MCP_LIST_TOOLS',
                    serverId: server.id,
                    transport: server.transport || 'sse',
                    url: server.url || ''
                });
            });
        }

        if (mcpEnableAllTools) {
            mcpEnableAllTools.addEventListener('click', () => {
                const server = this._getEditingServer();
                if (!server) return;
                const cached = this._getCachedTools(server);
                if (!cached || cached.length === 0) return;
                server.toolMode = 'selected';
                server.enabledTools = cached.map(t => t.name).filter(Boolean);
                this._loadEditingServerIntoForm();
                this._renderToolsUI();
            });
        }

        if (mcpDisableAllTools) {
            mcpDisableAllTools.addEventListener('click', () => {
                const server = this._getEditingServer();
                if (!server) return;
                server.toolMode = 'selected';
                server.enabledTools = [];
                this._loadEditingServerIntoForm();
                this._renderToolsUI();
            });
        }

        if (mcpTestConnection) {
            mcpTestConnection.addEventListener('click', () => {
                this._saveCurrentServerEdits();
                const server = this._getEditingServer();
                if (!server) return;

                this.setMcpTestStatus('Testing connection...');
                sendToBackground({
                    action: 'MCP_TEST_CONNECTION',
                    serverId: server.id,
                    transport: server.transport || 'sse',
                    url: server.url || ''
                });
            });
        }

        // --- Official API Model Fetch ---
        const { officialFetchModels, officialModelDropdown } = this.elements;
        if (officialFetchModels) {
            officialFetchModels.addEventListener('click', () => {
                this._fetchOfficialModels();
            });
        }

        if (officialModelDropdown) {
            officialModelDropdown.addEventListener('change', () => {
                this._onOfficialModelDropdownSelect();
            });
        }

        // --- OpenAI Multi-Config Events ---
        const {
            openaiConfigSelect,
            openaiAddConfig,
            openaiRemoveConfig,
            openaiConfigName,
            openaiProviderType,
            openaiBaseUrl,
            openaiApiKey,
            openaiModel,
            openaiTimeout,
            openaiSetDefault,
            claudeMaxTokens,
            claudeThinkingEnabled,
            claudeThinkingBudget
        } = this.elements;

        if (openaiConfigSelect) {
            openaiConfigSelect.addEventListener('change', (e) => {
                this._saveCurrentOpenaiConfigEdits();
                this.openaiActiveConfigId = e.target.value;
                this._loadActiveOpenaiConfigIntoForm();
                this._renderOpenaiConfigOptions();
                this._showOpenaiStatus('');
                this.fire('onOpenaiConfigChange', this.getActiveOpenaiToggles());
            });
        }

        if (openaiAddConfig) {
            openaiAddConfig.addEventListener('click', () => {
                // Validate max configs
                if (this.openaiConfigs.length >= 88) {
                    this._showOpenaiStatus('Maximum 88 configurations allowed', true);
                    return;
                }

                this._saveCurrentOpenaiConfigEdits();
                const config = this._getDefaultOpenaiConfig();
                this.openaiConfigs.push(config);
                this.openaiActiveConfigId = config.id;
                this._renderOpenaiConfigOptions();
                this._loadActiveOpenaiConfigIntoForm();
                this._showOpenaiStatus('');
            });
        }

        if (openaiRemoveConfig) {
            openaiRemoveConfig.addEventListener('click', () => {
                this._saveCurrentOpenaiConfigEdits();
                const id = this.openaiActiveConfigId;
                if (!id) return;

                // Prevent removing the last config
                if (this.openaiConfigs.length <= 1) {
                    this._showOpenaiStatus('Cannot remove the last configuration', true);
                    return;
                }

                this.openaiConfigs = this.openaiConfigs.filter(c => c.id !== id);
                this.openaiActiveConfigId = this.openaiConfigs[0].id;
                this._renderOpenaiConfigOptions();
                this._loadActiveOpenaiConfigIntoForm();
                this._showOpenaiStatus('');
            });
        }

        const onOpenaiEdit = () => {
            this._saveCurrentOpenaiConfigEdits();
            this._renderOpenaiConfigOptions();
        };

        if (openaiConfigName) openaiConfigName.addEventListener('input', onOpenaiEdit);
        if (openaiProviderType) {
            openaiProviderType.addEventListener('change', () => {
                this._saveCurrentOpenaiConfigEdits();
                this._updateClaudeOptionsVisibility();
                this._updateBaseUrlPlaceholder();
                this._renderOpenaiConfigOptions();
            });
        }
        if (openaiBaseUrl) openaiBaseUrl.addEventListener('input', onOpenaiEdit);
        if (openaiApiKey) openaiApiKey.addEventListener('input', onOpenaiEdit);
        if (openaiModel) openaiModel.addEventListener('input', onOpenaiEdit);
        if (openaiTimeout) openaiTimeout.addEventListener('input', onOpenaiEdit);
        if (claudeMaxTokens) claudeMaxTokens.addEventListener('input', onOpenaiEdit);
        if (claudeThinkingEnabled) {
            claudeThinkingEnabled.addEventListener('change', () => {
                this._saveCurrentOpenaiConfigEdits();
                this._updateClaudeThinkingBudgetVisibility();
            });
        }
        if (claudeThinkingBudget) claudeThinkingBudget.addEventListener('input', onOpenaiEdit);

        if (openaiSetDefault) {
            openaiSetDefault.addEventListener('change', () => {
                const config = this._getActiveOpenaiConfig();
                if (!config) return;

                // Clear isDefault from all configs
                this.openaiConfigs.forEach(c => c.isDefault = false);

                // Set current as default
                config.isDefault = openaiSetDefault.checked;

                this._showOpenaiStatus(openaiSetDefault.checked ? 'Set as default configuration' : '');
            });
        }

        // Fetch available models button
        const { openaiFetchModels, openaiModelDropdown } = this.elements;
        if (openaiFetchModels) {
            openaiFetchModels.addEventListener('click', () => {
                this._fetchAvailableModels();
            });
        }

        // Model dropdown selection
        if (openaiModelDropdown) {
            openaiModelDropdown.addEventListener('change', () => {
                this._onModelDropdownSelect();
            });
        }
    }

    setData(data) {
        const {
            providerSelect, officialBaseUrl, apiKeyInput, thinkingLevelSelect, officialModel,
            mcpEnabled
        } = this.elements;

        // Provider
        if (providerSelect) {
            providerSelect.value = data.provider || 'web';
            this.updateVisibility(data.provider || 'web');
        }

        // Official
        if (officialBaseUrl) officialBaseUrl.value = data.officialBaseUrl || "";
        if (apiKeyInput) apiKeyInput.value = data.apiKey || "";
        if (thinkingLevelSelect) thinkingLevelSelect.value = data.thinkingLevel || "low";
        if (officialModel) officialModel.value = data.officialModel || "";

        // OpenAI Multi-Config
        const openaiConfigs = Array.isArray(data.openaiConfigs) ? data.openaiConfigs : null;
        const openaiActiveId = typeof data.openaiActiveConfigId === 'string' ? data.openaiActiveConfigId : null;

        if (openaiConfigs && openaiConfigs.length > 0) {
            this.openaiConfigs = openaiConfigs.map(c => ({
                id: c.id || this._makeOpenaiConfigId(),
                name: c.name || '',
                providerType: c.providerType || 'openai', // Default to 'openai' for backward compatibility
                baseUrl: c.baseUrl || '',
                apiKey: c.apiKey || '',
                model: c.model || '',
                timeout: c.timeout || 60000,
                isDefault: c.isDefault === true,
                textSelectionEnabled: c.textSelectionEnabled !== false,
                imageToolsEnabled: c.imageToolsEnabled !== false,
                // Claude-specific options
                maxTokens: c.maxTokens || 8192,
                thinkingEnabled: c.thinkingEnabled === true,
                thinkingBudget: c.thinkingBudget || 10000
            }));
            this.openaiActiveConfigId = openaiActiveId && this.openaiConfigs.some(c => c.id === openaiActiveId)
                ? openaiActiveId
                : this.openaiConfigs[0].id;
        } else {
            // Create initial config from legacy single fields or empty
            const config = this._getDefaultOpenaiConfig();
            config.baseUrl = data.openaiBaseUrl || '';
            config.apiKey = data.openaiApiKey || '';
            config.model = data.openaiModel || '';
            config.isDefault = true;
            this.openaiConfigs = [config];
            this.openaiActiveConfigId = config.id;
        }

        this._renderOpenaiConfigOptions();
        this._loadActiveOpenaiConfigIntoForm();

        // MCP
        if (mcpEnabled) {
            mcpEnabled.checked = data.mcpEnabled === true;
            this.updateMcpVisibility(mcpEnabled.checked);
        }

        // Servers list (preferred)
        const servers = Array.isArray(data.mcpServers) ? data.mcpServers : null;
        // Support both legacy single ID and new multi-select array
        let activeIds = Array.isArray(data.mcpActiveServerIds) ? data.mcpActiveServerIds : null;
        if (!activeIds && typeof data.mcpActiveServerId === 'string') {
            activeIds = [data.mcpActiveServerId]; // Migrate from single to array
        }

        if (servers && servers.length > 0) {
            this.mcpServers = servers.map(s => ({
                id: s.id || this._makeServerId(),
                name: s.name || '',
                transport: s.transport || 'sse',
                url: s.url || '',
                enabled: s.enabled !== false,
                toolMode: s.toolMode === 'selected' ? 'selected' : 'all',
                enabledTools: Array.isArray(s.enabledTools) ? s.enabledTools : []
            }));

            // Filter activeIds to only include existing server IDs
            const serverIdSet = new Set(this.mcpServers.map(s => s.id));
            this.mcpActiveServerIds = activeIds
                ? activeIds.filter(id => serverIdSet.has(id))
                : [];

            // If no active servers but we have servers, default to first enabled server
            if (this.mcpActiveServerIds.length === 0) {
                const firstEnabled = this.mcpServers.find(s => s.enabled !== false);
                if (firstEnabled) {
                    this.mcpActiveServerIds = [firstEnabled.id];
                }
            }

            // Set editing server to first active or first in list
            this.mcpEditingServerId = this.mcpActiveServerIds[0] || this.mcpServers[0].id;
        } else {
            // Legacy single server fields
            const legacyUrl = data.mcpServerUrl || "";
            const legacyTransport = data.mcpTransport || "sse";
            const server = this._getDefaultServer();
            server.transport = legacyTransport;
            server.url = legacyUrl || server.url;
            server.enabled = data.mcpEnabled === true;
            this.mcpServers = [server];
            this.mcpActiveServerIds = data.mcpEnabled === true ? [server.id] : [];
            this.mcpEditingServerId = server.id;
        }

        this._renderMcpServerList();
        this._loadEditingServerIntoForm();
        this.setMcpTestStatus('');
    }

    getData() {
        const {
            providerSelect, officialBaseUrl, apiKeyInput, thinkingLevelSelect, officialModel,
            mcpEnabled
        } = this.elements;

        this._saveCurrentServerEdits();
        this._saveCurrentOpenaiConfigEdits();

        const servers = Array.isArray(this.mcpServers) ? this.mcpServers : [];
        // Get all active servers for multi-select
        const activeServers = this._getActiveServers();

        const openaiConfigs = Array.isArray(this.openaiConfigs) ? this.openaiConfigs : [];
        const activeOpenai = this._getActiveOpenaiConfig();

        return {
            provider: providerSelect ? providerSelect.value : 'web',
            // Official
            officialBaseUrl: officialBaseUrl ? officialBaseUrl.value.trim() : "",
            apiKey: apiKeyInput ? apiKeyInput.value.trim() : "",
            thinkingLevel: thinkingLevelSelect ? thinkingLevelSelect.value : "low",
            officialModel: officialModel ? officialModel.value.trim() : "",

            // OpenAI - Multi-config
            openaiConfigs: openaiConfigs,
            openaiActiveConfigId: this.openaiActiveConfigId || (openaiConfigs[0] ? openaiConfigs[0].id : null),

            // OpenAI - Legacy single fields (from active config for backward compat)
            openaiBaseUrl: activeOpenai ? activeOpenai.baseUrl : "",
            openaiApiKey: activeOpenai ? activeOpenai.apiKey : "",
            openaiModel: activeOpenai ? activeOpenai.model : "",

            // MCP - Multi-select support
            mcpEnabled: mcpEnabled ? mcpEnabled.checked === true : false,
            mcpServers: servers,
            mcpActiveServerIds: this.mcpActiveServerIds || [],
            // Legacy: keep first active server for backward compatibility
            mcpActiveServerId: this.mcpActiveServerIds[0] || (servers[0] ? servers[0].id : null),

            // Legacy: keep in sync with first active server for backward compatibility
            mcpTransport: activeServers.length > 0 ? (activeServers[0].transport || 'sse') : 'sse',
            mcpServerUrl: activeServers.length > 0 ? (activeServers[0].url || '') : ''
        };
    }

    updateVisibility(provider) {
        const { apiKeyContainer, officialFields, openaiFields } = this.elements;
        if (!apiKeyContainer) return;

        if (provider === 'web' || provider === 'grok') {
            apiKeyContainer.style.display = 'none';
        } else {
            apiKeyContainer.style.display = 'flex';
            if (provider === 'official') {
                if (officialFields) officialFields.style.display = 'flex';
                if (openaiFields) openaiFields.style.display = 'none';
            } else if (provider === 'openai') {
                if (officialFields) officialFields.style.display = 'none';
                if (openaiFields) openaiFields.style.display = 'flex';
            }
        }
    }

    updateMcpVisibility(enabled) {
        const { mcpFields } = this.elements;
        if (!mcpFields) return;
        mcpFields.style.display = enabled ? 'flex' : 'none';
    }

    // --- OpenAI Multi-Config Helpers ---

    _makeOpenaiConfigId() {
        return `cfg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    _getDefaultOpenaiConfig() {
        return {
            id: this._makeOpenaiConfigId(),
            name: 'New Configuration',
            providerType: 'openai', // 'openai' | 'claude'
            baseUrl: '',
            apiKey: '',
            model: '',
            timeout: 60000,
            isDefault: false,
            textSelectionEnabled: true,
            imageToolsEnabled: true,
            // Claude-specific options
            maxTokens: 8192,
            thinkingEnabled: false,
            thinkingBudget: 10000
        };
    }

    _getActiveOpenaiConfig() {
        if (!this.openaiConfigs || this.openaiConfigs.length === 0) return null;
        const activeId = this.openaiActiveConfigId;
        const match = activeId ? this.openaiConfigs.find(c => c.id === activeId) : null;
        return match || this.openaiConfigs[0];
    }

    _saveCurrentOpenaiConfigEdits() {
        const {
            openaiConfigName,
            openaiProviderType,
            openaiBaseUrl,
            openaiApiKey,
            openaiModel,
            openaiTimeout,
            openaiSetDefault,
            claudeMaxTokens,
            claudeThinkingEnabled,
            claudeThinkingBudget
        } = this.elements;

        const config = this._getActiveOpenaiConfig();
        if (!config) return;

        if (openaiConfigName) config.name = openaiConfigName.value || '';
        if (openaiProviderType) config.providerType = openaiProviderType.value || 'openai';
        if (openaiBaseUrl) config.baseUrl = (openaiBaseUrl.value || '').trim();
        if (openaiApiKey) config.apiKey = (openaiApiKey.value || '').trim();
        if (openaiModel) config.model = (openaiModel.value || '').trim();
        if (openaiTimeout) config.timeout = parseInt(openaiTimeout.value, 10) || 60000;
        // Claude-specific options
        if (claudeMaxTokens) config.maxTokens = parseInt(claudeMaxTokens.value, 10) || 8192;
        if (claudeThinkingEnabled) config.thinkingEnabled = claudeThinkingEnabled.checked === true;
        if (claudeThinkingBudget) config.thinkingBudget = parseInt(claudeThinkingBudget.value, 10) || 10000;
        if (openaiSetDefault) {
            if (openaiSetDefault.checked) {
                // Clear isDefault from all other configs
                this.openaiConfigs.forEach(c => c.isDefault = (c.id === config.id));
            }
            config.isDefault = openaiSetDefault.checked;
        }
    }

    _loadActiveOpenaiConfigIntoForm() {
        const {
            openaiConfigSelect,
            openaiConfigName,
            openaiProviderType,
            openaiBaseUrl,
            openaiApiKey,
            openaiModel,
            openaiTimeout,
            openaiSetDefault,
            claudeMaxTokens,
            claudeThinkingEnabled,
            claudeThinkingBudget
        } = this.elements;

        const config = this._getActiveOpenaiConfig();
        if (!config) return;

        if (openaiConfigSelect) openaiConfigSelect.value = config.id;
        if (openaiConfigName) openaiConfigName.value = config.name || '';
        if (openaiProviderType) openaiProviderType.value = config.providerType || 'openai';
        if (openaiBaseUrl) openaiBaseUrl.value = config.baseUrl || '';
        if (openaiApiKey) openaiApiKey.value = config.apiKey || '';
        if (openaiModel) openaiModel.value = config.model || '';
        if (openaiTimeout) openaiTimeout.value = config.timeout || 60000;
        // Claude-specific options
        if (claudeMaxTokens) claudeMaxTokens.value = config.maxTokens || 8192;
        if (claudeThinkingEnabled) claudeThinkingEnabled.checked = config.thinkingEnabled === true;
        if (claudeThinkingBudget) claudeThinkingBudget.value = config.thinkingBudget || 10000;
        if (openaiSetDefault) openaiSetDefault.checked = config.isDefault === true;

        // Update visibility based on provider type
        this._updateClaudeOptionsVisibility();
        this._updateClaudeThinkingBudgetVisibility();
        this._updateBaseUrlPlaceholder();
    }

    _renderOpenaiConfigOptions() {
        const { openaiConfigSelect } = this.elements;
        if (!openaiConfigSelect) return;

        const active = this._getActiveOpenaiConfig();
        if (active) this.openaiActiveConfigId = active.id;

        openaiConfigSelect.innerHTML = '';
        for (const config of this.openaiConfigs) {
            const opt = document.createElement('option');
            opt.value = config.id;

            const name = (config.name || '').trim();
            const label = name || config.baseUrl || 'Unnamed Config';
            opt.textContent = config.isDefault ? `${label} ★` : label;
            openaiConfigSelect.appendChild(opt);
        }

        if (active) openaiConfigSelect.value = active.id;
    }

    _updateClaudeOptionsVisibility() {
        const { openaiProviderType, claudeOptions } = this.elements;
        if (!claudeOptions) return;

        const isClaude = openaiProviderType && openaiProviderType.value === 'claude';
        claudeOptions.style.display = isClaude ? 'flex' : 'none';
    }

    _updateClaudeThinkingBudgetVisibility() {
        const { claudeThinkingEnabled, claudeThinkingBudgetContainer } = this.elements;
        if (!claudeThinkingBudgetContainer) return;

        const isEnabled = claudeThinkingEnabled && claudeThinkingEnabled.checked;
        claudeThinkingBudgetContainer.style.display = isEnabled ? 'block' : 'none';
    }

    _updateBaseUrlPlaceholder() {
        const { openaiProviderType, openaiBaseUrl } = this.elements;
        if (!openaiBaseUrl) return;

        const isClaude = openaiProviderType && openaiProviderType.value === 'claude';
        openaiBaseUrl.placeholder = isClaude
            ? 'https://api.anthropic.com'
            : 'https://api.openai.com/v1';
    }

    _showOpenaiStatus(text, isError = false) {
        const { openaiConfigStatus } = this.elements;
        if (!openaiConfigStatus) return;

        if (!text) {
            openaiConfigStatus.style.display = 'none';
            openaiConfigStatus.textContent = '';
            return;
        }

        openaiConfigStatus.style.display = 'block';
        openaiConfigStatus.textContent = text;
        openaiConfigStatus.style.color = isError ? '#b00020' : '#4CAF50';

        // Auto-hide success messages after 2 seconds
        if (!isError) {
            setTimeout(() => {
                if (openaiConfigStatus.textContent === text) {
                    openaiConfigStatus.style.display = 'none';
                }
            }, 2000);
        }
    }

    _showOfficialFetchStatus(text, isError = false) {
        const { officialFetchStatus } = this.elements;
        if (!officialFetchStatus) return;

        if (!text) {
            officialFetchStatus.style.display = 'none';
            officialFetchStatus.textContent = '';
            return;
        }

        officialFetchStatus.style.display = 'block';
        officialFetchStatus.textContent = text;
        officialFetchStatus.style.color = isError ? '#b00020' : '#4CAF50';
    }

    _normalizeOfficialModelId(name) {
        if (!name) return '';
        return name.replace(/^models\//, '');
    }

    async _fetchOfficialModels() {
        const { officialBaseUrl, apiKeyInput, officialModelDropdown, officialFetchModels } = this.elements;

        const baseUrl = officialBaseUrl ? officialBaseUrl.value.trim().replace(/\/$/, '') : '';
        const rawKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        const apiKey = rawKey.split(',').map(k => k.trim()).filter(k => k)[0] || '';

        if (!baseUrl) {
            this._showOfficialFetchStatus('Base URL is required', true);
            return;
        }

        if (!apiKey) {
            this._showOfficialFetchStatus('API key is required', true);
            return;
        }

        if (officialFetchModels) officialFetchModels.disabled = true;
        this._showOfficialFetchStatus('Fetching models...');

        if (officialModelDropdown) officialModelDropdown.style.display = 'none';

        try {
            const url = `${baseUrl}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
            const response = await fetch(url, { method: 'GET' });

            if (!response.ok) {
                let errorText = await response.text();
                try {
                    const errJson = JSON.parse(errorText);
                    if (errJson.error?.message) errorText = errJson.error.message;
                } catch (e) { }
                throw new Error(`${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const rawModels = Array.isArray(data.models)
                ? data.models
                : (Array.isArray(data.data) ? data.data : []);

            const modelIds = rawModels
                .map(m => this._normalizeOfficialModelId(m.name || m.id || ''))
                .filter(Boolean);

            const uniqueModels = Array.from(new Set(modelIds)).sort();

            if (uniqueModels.length === 0) {
                this._showOfficialFetchStatus('No models found', true);
                return;
            }

            this._populateOfficialModelDropdown(uniqueModels);
            this._showOfficialFetchStatus(`Found ${uniqueModels.length} model(s)`);

            setTimeout(() => this._showOfficialFetchStatus(''), 3000);
        } catch (err) {
            this._showOfficialFetchStatus(err.message || 'Failed to fetch models', true);
        } finally {
            if (officialFetchModels) officialFetchModels.disabled = false;
        }
    }

    _populateOfficialModelDropdown(modelIds) {
        const { officialModelDropdown } = this.elements;
        if (!officialModelDropdown) return;

        officialModelDropdown.innerHTML = '<option value="" disabled selected>-- 选择模型 --</option>';
        for (const id of modelIds) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = id;
            officialModelDropdown.appendChild(opt);
        }

        officialModelDropdown.style.display = 'block';
    }

    _onOfficialModelDropdownSelect() {
        const { officialModelDropdown, officialModel } = this.elements;
        if (!officialModelDropdown || !officialModel) return;

        const selectedModel = officialModelDropdown.value;
        if (!selectedModel) return;

        const currentValue = officialModel.value.trim();
        if (currentValue) {
            const existing = currentValue.split(',').map(s => s.trim());
            if (!existing.includes(selectedModel)) {
                officialModel.value = currentValue + ', ' + selectedModel;
            }
        } else {
            officialModel.value = selectedModel;
        }

        officialModelDropdown.selectedIndex = 0;
    }

    _showFetchStatus(text, isError = false) {
        const { openaiFetchStatus } = this.elements;
        if (!openaiFetchStatus) return;

        if (!text) {
            openaiFetchStatus.style.display = 'none';
            openaiFetchStatus.textContent = '';
            return;
        }

        openaiFetchStatus.style.display = 'block';
        openaiFetchStatus.textContent = text;
        openaiFetchStatus.style.color = isError ? '#b00020' : '#4CAF50';
    }

    async _fetchAvailableModels() {
        const { openaiProviderType, openaiBaseUrl, openaiApiKey, openaiModelDropdown, openaiFetchModels } = this.elements;

        const providerType = openaiProviderType ? openaiProviderType.value : 'openai';
        const baseUrl = openaiBaseUrl ? openaiBaseUrl.value.trim().replace(/\/$/, '') : '';
        const apiKey = openaiApiKey ? openaiApiKey.value.trim() : '';

        if (!baseUrl) {
            this._showFetchStatus('Base URL is required', true);
            return;
        }

        // Disable button during fetch
        if (openaiFetchModels) openaiFetchModels.disabled = true;
        this._showFetchStatus('Fetching models...');

        // Hide dropdown while fetching
        if (openaiModelDropdown) openaiModelDropdown.style.display = 'none';

        try {
            const isClaude = providerType === 'claude';
            const url = isClaude ? `${baseUrl}/v1/models` : `${baseUrl}/models`;

            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) {
                if (isClaude) {
                    headers['x-api-key'] = apiKey;
                    headers['anthropic-version'] = '2023-06-01';
                } else {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
            }

            const response = await fetch(url, { method: 'GET', headers });

            if (!response.ok) {
                let errorText = await response.text();
                try {
                    const errJson = JSON.parse(errorText);
                    if (errJson.error?.message) errorText = errJson.error.message;
                } catch (e) { }
                throw new Error(`${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const models = Array.isArray(data.data) ? data.data : [];

            if (models.length === 0) {
                this._showFetchStatus('No models found', true);
                return;
            }

            // Populate dropdown
            this._populateModelDropdown(models);
            this._showFetchStatus(`Found ${models.length} model(s)`);

            // Auto-hide status after 3 seconds
            setTimeout(() => this._showFetchStatus(''), 3000);

        } catch (err) {
            this._showFetchStatus(err.message || 'Failed to fetch models', true);
        } finally {
            if (openaiFetchModels) openaiFetchModels.disabled = false;
        }
    }

    _populateModelDropdown(models) {
        const { openaiModelDropdown } = this.elements;
        if (!openaiModelDropdown) return;

        // Clear existing options
        openaiModelDropdown.innerHTML = '<option value="" disabled selected>-- 选择模型 --</option>';

        // Add model options
        const modelIds = models.map(m => m.id).filter(Boolean).sort();
        for (const id of modelIds) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = id;
            openaiModelDropdown.appendChild(opt);
        }

        // Show dropdown
        openaiModelDropdown.style.display = 'block';
    }

    _onModelDropdownSelect() {
        const { openaiModelDropdown, openaiModel } = this.elements;
        if (!openaiModelDropdown || !openaiModel) return;

        const selectedModel = openaiModelDropdown.value;
        if (!selectedModel) return;

        // Append to existing models (comma separated) or set as new value
        const currentValue = openaiModel.value.trim();
        if (currentValue) {
            // Check if already exists
            const existing = currentValue.split(',').map(s => s.trim());
            if (!existing.includes(selectedModel)) {
                openaiModel.value = currentValue + ', ' + selectedModel;
            }
        } else {
            openaiModel.value = selectedModel;
        }

        // Reset dropdown to placeholder
        openaiModelDropdown.selectedIndex = 0;

        // Trigger input event to save changes
        openaiModel.dispatchEvent(new Event('input', { bubbles: true }));
    }

    _getActiveServer() {
        // Legacy: returns first active server for backward compatibility
        if (!this.mcpServers || this.mcpServers.length === 0) return null;
        if (this.mcpActiveServerIds.length > 0) {
            const firstId = this.mcpActiveServerIds[0];
            return this.mcpServers.find(s => s.id === firstId) || this.mcpServers[0];
        }
        return this.mcpServers[0];
    }

    _getActiveServers() {
        // Returns all active servers for multi-select
        if (!this.mcpServers || this.mcpServers.length === 0) return [];
        const activeIds = new Set(this.mcpActiveServerIds || []);
        return this.mcpServers.filter(s => activeIds.has(s.id) && s.url && s.url.trim());
    }

    _getEditingServer() {
        // Returns the currently editing server (for form binding)
        if (!this.mcpServers || this.mcpServers.length === 0) return null;
        const editId = this.mcpEditingServerId;
        const match = editId ? this.mcpServers.find(s => s.id === editId) : null;
        return match || this.mcpServers[0];
    }

    _saveCurrentServerEdits() {
        const {
            mcpServerName,
            mcpTransport,
            mcpServerUrl,
            mcpServerEnabled,
            mcpToolMode
        } = this.elements;

        const server = this._getEditingServer();
        if (!server) return;

        const prevKey = this._serverKey(server);

        if (mcpServerName) server.name = mcpServerName.value || '';
        if (mcpTransport) server.transport = mcpTransport.value || 'sse';
        if (mcpServerUrl) server.url = (mcpServerUrl.value || '').trim();
        if (mcpServerEnabled) server.enabled = mcpServerEnabled.checked === true;
        if (mcpToolMode) server.toolMode = mcpToolMode.value === 'selected' ? 'selected' : 'all';

        // If transport/url changed, invalidate cached tool list for this server.
        const nextKey = this._serverKey(server);
        if (prevKey !== nextKey) {
            this.mcpToolsCache.delete(server.id);
        }
    }

    _loadEditingServerIntoForm() {
        const {
            mcpServerName,
            mcpTransport,
            mcpServerUrl,
            mcpServerEnabled,
            mcpToolMode
        } = this.elements;

        const server = this._getEditingServer();
        if (!server) return;

        if (mcpServerName) mcpServerName.value = server.name || '';
        if (mcpTransport) mcpTransport.value = server.transport || 'sse';
        if (mcpServerUrl) mcpServerUrl.value = server.url || '';
        if (mcpServerUrl) mcpServerUrl.placeholder = this._getDefaultUrlForTransport(server.transport || 'sse');
        if (mcpServerEnabled) mcpServerEnabled.checked = server.enabled !== false;
        if (mcpToolMode) mcpToolMode.value = server.toolMode === 'selected' ? 'selected' : 'all';

        this._renderToolsUI();
    }

    _renderMcpServerList() {
        const { mcpServerList } = this.elements;
        if (!mcpServerList) return;

        mcpServerList.innerHTML = '';

        const activeIds = new Set(this.mcpActiveServerIds || []);
        const editingId = this.mcpEditingServerId;

        for (const server of this.mcpServers) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';
            row.style.padding = '6px 8px';
            row.style.borderRadius = '6px';
            row.style.cursor = 'pointer';
            row.style.transition = 'background 0.15s';

            // Highlight editing server
            if (server.id === editingId) {
                row.style.background = 'rgba(66, 133, 244, 0.15)';
                row.style.border = '1px solid rgba(66, 133, 244, 0.4)';
            } else {
                row.style.background = 'transparent';
                row.style.border = '1px solid transparent';
            }

            // Active checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = activeIds.has(server.id);
            checkbox.style.flexShrink = '0';
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!this.mcpActiveServerIds.includes(server.id)) {
                        this.mcpActiveServerIds.push(server.id);
                    }
                } else {
                    this.mcpActiveServerIds = this.mcpActiveServerIds.filter(id => id !== server.id);
                }
                this._renderMcpServerList();
            });

            // Server label
            const label = document.createElement('div');
            label.style.flex = '1';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.whiteSpace = 'nowrap';
            label.style.fontSize = '12px';

            const name = (server.name || '').trim();
            const displayLabel = name || server.url || 'MCP Server';
            label.textContent = server.enabled === false ? `${displayLabel} (disabled)` : displayLabel;

            if (!activeIds.has(server.id)) {
                label.style.opacity = '0.6';
            }

            // Click row to select for editing
            row.addEventListener('click', () => {
                this._saveCurrentServerEdits();
                this.mcpEditingServerId = server.id;
                this._renderMcpServerList();
                this._loadEditingServerIntoForm();
                this.setMcpTestStatus('');
            });

            row.appendChild(checkbox);
            row.appendChild(label);
            mcpServerList.appendChild(row);
        }

        // Show summary of active servers
        const activeCount = this.mcpActiveServerIds.length;
        const totalCount = this.mcpServers.length;
        const summaryDiv = document.createElement('div');
        summaryDiv.style.fontSize = '11px';
        summaryDiv.style.opacity = '0.75';
        summaryDiv.style.marginTop = '4px';
        summaryDiv.style.padding = '0 4px';
        if (activeCount === 0) {
            summaryDiv.textContent = 'No servers selected';
            summaryDiv.style.color = '#b00020';
        } else {
            summaryDiv.textContent = `${activeCount} of ${totalCount} server(s) active`;
        }
        mcpServerList.appendChild(summaryDiv);
    }

    // Keep legacy method name for any potential external calls
    _renderMcpServerOptions() {
        this._renderMcpServerList();
    }

    // Keep legacy method for compatibility
    _loadActiveServerIntoForm() {
        this._loadEditingServerIntoForm();
    }

    setMcpTestStatus(text, isError = false) {
        const { mcpTestStatus } = this.elements;
        if (!mcpTestStatus) return;
        mcpTestStatus.textContent = text || '';
        mcpTestStatus.style.color = isError ? '#b00020' : '';
    }

    _serverKey(server) {
        const transport = (server.transport || 'sse').toLowerCase();
        const url = (server.url || '').trim();
        return `${transport}:${url}`;
    }

    _getCachedTools(server) {
        const entry = this.mcpToolsCache.get(server.id);
        if (!entry) return null;
        if (entry.key !== this._serverKey(server)) return null;
        return Array.isArray(entry.tools) ? entry.tools : null;
    }

    setMcpToolsList(serverId, transport, url, tools) {
        const id = serverId || (this._getActiveServer() ? this._getActiveServer().id : null);
        if (!id) return;

        this.mcpToolsCache.set(id, {
            key: `${(transport || 'sse').toLowerCase()}:${(url || '').trim()}`,
            tools: Array.isArray(tools) ? tools : []
        });

        this.setMcpTestStatus('');
        this._renderToolsUI();
    }

    _renderToolsUI() {
        const { mcpToolsSummary, mcpToolList, mcpToolSearch } = this.elements;
        const server = this._getEditingServer();
        if (!server || !mcpToolList || !mcpToolsSummary) return;

        const cached = this._getCachedTools(server) || [];
        const toolMode = server.toolMode === 'selected' ? 'selected' : 'all';

        // Summary
        const enabledSet = new Set(Array.isArray(server.enabledTools) ? server.enabledTools : []);
        const total = cached.length;
        const enabledCount = toolMode === 'all' ? total : enabledSet.size;
        const modeLabel = toolMode === 'all' ? 'all' : 'selected';

        if (!server.url || !server.url.trim()) {
            mcpToolsSummary.textContent = 'Set Server URL to manage tools.';
        } else if (total === 0) {
            mcpToolsSummary.textContent = toolMode === 'all'
                ? 'All tools will be exposed. Click "Refresh Tools" to preview the tool list.'
                : 'No tool list loaded. Click "Refresh Tools" to load tools, then select which to expose.';
        } else {
            mcpToolsSummary.textContent = toolMode === 'all'
                ? `Mode: ${modeLabel}. Tools exposed: ${enabledCount}/${total}.`
                : `Mode: ${modeLabel}. Tools exposed: ${enabledCount}/${total}.`;
        }

        // Tool list
        mcpToolList.innerHTML = '';

        if (toolMode === 'all') {
            const div = document.createElement('div');
            div.style.opacity = '0.85';
            div.style.fontSize = '12px';
            div.textContent = 'Switch to "Selected tools only" to choose which tools the model can use.';
            mcpToolList.appendChild(div);
            return;
        }

        if (cached.length === 0) {
            const div = document.createElement('div');
            div.style.opacity = '0.85';
            div.style.fontSize = '12px';
            div.textContent = 'No tools loaded yet.';
            mcpToolList.appendChild(div);
            return;
        }

        const search = mcpToolSearch ? (mcpToolSearch.value || '').trim().toLowerCase() : '';
        const filtered = search
            ? cached.filter(t => (t.name || '').toLowerCase().includes(search) || (t.description || '').toLowerCase().includes(search))
            : cached;

        // Group tools by "server.tool" prefix (like MCP-SuperAssistant).
        const groups = new Map(); // groupName -> tools[]
        const ungroupedKey = '(other)';

        for (const tool of filtered) {
            const toolName = tool.name || '';
            if (!toolName) continue;
            const dot = toolName.indexOf('.');
            const group = dot > 0 ? toolName.slice(0, dot) : ungroupedKey;
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push(tool);
        }

        const sortedGroupNames = Array.from(groups.keys()).sort((a, b) => {
            if (a === ungroupedKey) return 1;
            if (b === ungroupedKey) return -1;
            return a.localeCompare(b);
        });

        const uiState = this._getToolsUiState(server.id);

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';

        const renderToolRow = (tool) => {
            const toolName = tool.name || '';
            const dot = toolName.indexOf('.');
            const displayName = dot > 0 ? toolName.slice(dot + 1) : toolName;

            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.alignItems = 'flex-start';
            row.style.gap = '8px';
            row.style.cursor = 'pointer';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = enabledSet.has(toolName);
            cb.addEventListener('change', () => {
                if (cb.checked) enabledSet.add(toolName);
                else enabledSet.delete(toolName);
                server.enabledTools = Array.from(enabledSet);
                // Avoid full rerender for single toggles? For correctness, rerender to keep group counts accurate.
                this._renderToolsUI();
            });

            const text = document.createElement('div');
            text.style.display = 'flex';
            text.style.flexDirection = 'column';
            text.style.gap = '2px';

            const nameEl = document.createElement('div');
            nameEl.style.fontSize = '12px';
            nameEl.style.fontWeight = '500';
            nameEl.textContent = displayName;

            const fullEl = document.createElement('div');
            fullEl.style.fontSize = '11px';
            fullEl.style.opacity = '0.7';
            fullEl.textContent = toolName;

            const descEl = document.createElement('div');
            descEl.style.fontSize = '11px';
            descEl.style.opacity = '0.85';
            descEl.textContent = tool.description || '';

            text.appendChild(nameEl);
            text.appendChild(fullEl);
            if (tool.description) text.appendChild(descEl);

            row.appendChild(cb);
            row.appendChild(text);
            return row;
        };

        const renderGroup = (groupName, tools) => {
            tools.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Group header counts
            const toolNames = tools.map(t => t.name).filter(Boolean);
            const enabledCountInGroup = toolNames.filter(n => enabledSet.has(n)).length;
            const totalInGroup = toolNames.length;

            const details = document.createElement('details');
            details.open = uiState.openGroups.has(groupName);
            details.addEventListener('toggle', () => {
                if (details.open) uiState.openGroups.add(groupName);
                else uiState.openGroups.delete(groupName);
            });

            const summary = document.createElement('summary');
            summary.style.cursor = 'pointer';
            summary.style.userSelect = 'none';
            summary.style.display = 'flex';
            summary.style.alignItems = 'center';
            summary.style.justifyContent = 'space-between';
            summary.style.gap = '10px';
            summary.style.padding = '6px 8px';
            summary.style.background = 'rgba(0,0,0,0.04)';
            summary.style.borderRadius = '8px';
            summary.style.listStyle = 'none';

            // Left: checkbox + group name
            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '8px';

            const groupCb = document.createElement('input');
            groupCb.type = 'checkbox';
            groupCb.checked = totalInGroup > 0 && enabledCountInGroup === totalInGroup;
            groupCb.indeterminate = enabledCountInGroup > 0 && enabledCountInGroup < totalInGroup;
            groupCb.addEventListener('click', (e) => {
                // Prevent toggling <details> when clicking checkbox
                e.stopPropagation();
            });
            groupCb.addEventListener('change', () => {
                if (groupCb.checked) {
                    for (const n of toolNames) enabledSet.add(n);
                } else {
                    for (const n of toolNames) enabledSet.delete(n);
                }
                server.enabledTools = Array.from(enabledSet);
                this._renderToolsUI();
            });

            const groupTitle = document.createElement('div');
            groupTitle.style.fontSize = '12px';
            groupTitle.style.fontWeight = '600';
            groupTitle.textContent = groupName === ungroupedKey ? 'Other tools' : groupName;

            left.appendChild(groupCb);
            left.appendChild(groupTitle);

            // Right: counts
            const right = document.createElement('div');
            right.style.fontSize = '12px';
            right.style.opacity = '0.85';
            right.textContent = `${enabledCountInGroup}/${totalInGroup}`;

            summary.appendChild(left);
            summary.appendChild(right);

            const list = document.createElement('div');
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.gap = '6px';
            list.style.padding = '8px 2px 2px 2px';

            for (const tool of tools) {
                list.appendChild(renderToolRow(tool));
            }

            details.appendChild(summary);
            details.appendChild(list);
            return details;
        };

        for (const groupName of sortedGroupNames) {
            container.appendChild(renderGroup(groupName, groups.get(groupName)));
        }

        mcpToolList.appendChild(container);
    }

    _getToolsUiState(serverId) {
        const key = serverId || 'default';
        const existing = this.mcpToolsUiState.get(key);
        if (existing) return existing;

        const state = { openGroups: new Set() };
        // Default: keep groups expanded for usability.
        state.openGroups.add('(other)');
        this.mcpToolsUiState.set(key, state);
        return state;
    }

    fire(event, data) {
        if (this.callbacks[event]) this.callbacks[event](data);
    }

    getActiveOpenaiToggles() {
        const config = this._getActiveOpenaiConfig();
        if (!config) return null;
        return {
            textSelectionEnabled: config.textSelectionEnabled !== false,
            imageToolsEnabled: config.imageToolsEnabled !== false
        };
    }

    updateActiveOpenaiToggles(textSelection, imageTools) {
        const config = this._getActiveOpenaiConfig();
        if (!config) return;
        config.textSelectionEnabled = textSelection;
        config.imageToolsEnabled = imageTools;
    }

    getCurrentProvider() {
        const { providerSelect } = this.elements;
        return providerSelect ? providerSelect.value : 'web';
    }
}
