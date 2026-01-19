
// sidepanel/core/bridge.js
import { downloadFile, downloadText } from '../utils/download.js';

export class MessageBridge {
    constructor(frameManager, stateManager) {
        this.frame = frameManager;
        this.state = stateManager;
    }

    init() {
        window.addEventListener('message', this.handleWindowMessage.bind(this));
        chrome.runtime.onMessage.addListener(this.handleRuntimeMessage.bind(this));
    }

    handleWindowMessage(event) {
        // Security check: Only accept messages from our direct iframe
        if (!this.frame.isWindow(event.source)) return;

        const { action, payload } = event.data;

        // 1. Handshake
        if (action === 'UI_READY') {
            this.state.markUiReady();
            return;
        }

        // 2. Window Management
        if (action === 'OPEN_FULL_PAGE') {
            const url = chrome.runtime.getURL('sidepanel/index.html');
            chrome.tabs.create({ url });
            return;
        }

        // 3. Background Forwarding
        if (action === 'FORWARD_TO_BACKGROUND') {
            chrome.runtime.sendMessage(payload)
                .then(response => {
                    // If request demands a reply (e.g., GET_LOGS, CHECK_PAGE_CONTEXT), send it back
                    if (response && (payload.action === 'GET_LOGS' || payload.action === 'CHECK_PAGE_CONTEXT' || payload.action === 'MCP_TEST_CONNECTION' || payload.action === 'MCP_LIST_TOOLS')) {
                        this.frame.postMessage({
                            action: 'BACKGROUND_MESSAGE',
                            payload: response
                        });
                    }
                })
                .catch(err => console.warn("Error forwarding to background:", err));
            return;
        }

        // 4. Downloads
        if (action === 'DOWNLOAD_IMAGE') {
            downloadFile(payload.url, payload.filename);
            return;
        }
        if (action === 'DOWNLOAD_LOGS') {
            downloadText(payload.text, payload.filename || 'chubby-cat-logs.txt');
            return;
        }
        if (action === 'DOWNLOAD_EXPORT_TEXT') {
            downloadText(payload.text, payload.filename || 'chubby-cat-configs.json');
            return;
        }

        // 4.5 Save Chat as Markdown (via chrome.downloads)
        if (action === 'SAVE_CHAT_MARKDOWN') {
            this.saveChatMarkdown(payload);
            return;
        }

        // 5. Data Getters (Immediate Response)
        if (action === 'GET_THEME') {
            this.frame.postMessage({ action: 'RESTORE_THEME', payload: this.state.getCached('geminiTheme') });
            return;
        }
        if (action === 'GET_LANGUAGE') {
            this.frame.postMessage({ action: 'RESTORE_LANGUAGE', payload: this.state.getCached('geminiLanguage') });
            return;
        }
        if (action === 'GET_TEXT_SELECTION') {
            // Some keys might not be in initial bulk fetch if added later, but usually are.
            // Fallback to async storage if needed, but state.data usually has it.
            chrome.storage.local.get(['geminiTextSelectionEnabled'], (res) => {
                const val = res.geminiTextSelectionEnabled !== false;
                this.frame.postMessage({ action: 'RESTORE_TEXT_SELECTION', payload: val });
            });
            return;
        }
        if (action === 'GET_IMAGE_TOOLS') {
            chrome.storage.local.get(['geminiImageToolsEnabled'], (res) => {
                const val = res.geminiImageToolsEnabled !== false;
                this.frame.postMessage({ action: 'RESTORE_IMAGE_TOOLS', payload: val });
            });
            return;
        }
        if (action === 'GET_ACCOUNT_INDICES') {
            chrome.storage.local.get(['geminiAccountIndices'], (res) => {
                this.frame.postMessage({ action: 'RESTORE_ACCOUNT_INDICES', payload: res.geminiAccountIndices || "0" });
            });
            return;
        }
        if (action === 'GET_CONNECTION_SETTINGS') {
            chrome.storage.local.get([
                'geminiProvider',
                'geminiUseOfficialApi',
                'geminiOfficialBaseUrl',
                'geminiApiKey',
                'geminiThinkingLevel',
                'geminiOfficialModel',
                'geminiOpenaiBaseUrl',
                'geminiOpenaiApiKey',
                'geminiOpenaiModel',
                'geminiOpenaiConfigs',
                'geminiOpenaiActiveConfigId',
                'geminiDocProcessingEnabled',
                'geminiDocProcessingProvider',
                'geminiDocProcessingBaseUrl',
                'geminiDocProcessingApiKey',
                'geminiDocProcessingModel',
                'geminiMcpEnabled',
                'geminiMcpTransport',
                'geminiMcpServerUrl',
                'geminiMcpServers',
                'geminiMcpActiveServerId',
                'geminiMcpActiveServerIds'
            ], (res) => {
                // Handle OpenAI configs with backward compatibility
                let openaiConfigs = Array.isArray(res.geminiOpenaiConfigs) ? res.geminiOpenaiConfigs : null;
                let openaiActiveConfigId = res.geminiOpenaiActiveConfigId || null;

                // Migration: if no configs but legacy single fields exist, create initial config
                if (!openaiConfigs && (res.geminiOpenaiBaseUrl || res.geminiOpenaiApiKey || res.geminiOpenaiModel)) {
                    const migratedConfig = {
                        id: `cfg_${Date.now()}`,
                        name: 'Default',
                        baseUrl: res.geminiOpenaiBaseUrl || '',
                        apiKey: res.geminiOpenaiApiKey || '',
                        model: res.geminiOpenaiModel || '',
                        timeout: 60000,
                        isDefault: true
                    };
                    openaiConfigs = [migratedConfig];
                    openaiActiveConfigId = migratedConfig.id;
                }

                // Get active config for legacy field compatibility
                const activeConfig = openaiConfigs && openaiActiveConfigId
                    ? openaiConfigs.find(c => c.id === openaiActiveConfigId) || openaiConfigs[0]
                    : null;

                this.frame.postMessage({
                    action: 'RESTORE_CONNECTION_SETTINGS',
                    payload: {
                        provider: res.geminiProvider || (res.geminiUseOfficialApi ? 'official' : 'web'),
                        useOfficialApi: res.geminiUseOfficialApi === true,
                        officialBaseUrl: res.geminiOfficialBaseUrl || '',
                        apiKey: res.geminiApiKey || "",
                        thinkingLevel: res.geminiThinkingLevel || "low",
                        officialModel: res.geminiOfficialModel || "",
                        // Legacy single fields (populated from active config)
                        openaiBaseUrl: activeConfig ? activeConfig.baseUrl : (res.geminiOpenaiBaseUrl || ""),
                        openaiApiKey: activeConfig ? activeConfig.apiKey : (res.geminiOpenaiApiKey || ""),
                        openaiModel: activeConfig ? activeConfig.model : (res.geminiOpenaiModel || ""),
                        // Document Processing (OCR)
                        docProcessingEnabled: res.geminiDocProcessingEnabled === true,
                        docProcessingProvider: res.geminiDocProcessingProvider || 'mistral',
                        docProcessingBaseUrl: res.geminiDocProcessingBaseUrl || 'https://api.mistral.ai/v1/ocr',
                        docProcessingApiKey: res.geminiDocProcessingApiKey || '',
                        docProcessingModel: res.geminiDocProcessingModel || 'mistral-ocr-latest',
                        // Multi-config support
                        openaiConfigs: openaiConfigs,
                        openaiActiveConfigId: openaiActiveConfigId,
                        // MCP - Multi-select support
                        mcpEnabled: res.geminiMcpEnabled === true,
                        mcpTransport: res.geminiMcpTransport || "sse",
                        mcpServerUrl: res.geminiMcpServerUrl || "http://127.0.0.1:3006/sse",
                        mcpServers: Array.isArray(res.geminiMcpServers) ? res.geminiMcpServers : null,
                        mcpActiveServerId: res.geminiMcpActiveServerId || null,
                        mcpActiveServerIds: Array.isArray(res.geminiMcpActiveServerIds) ? res.geminiMcpActiveServerIds : null
                    }
                });
            });
            return;
        }

        if (action === 'GET_QUICK_PHRASES') {
            chrome.storage.local.get(['geminiQuickPhrases'], (res) => {
                const phrases = Array.isArray(res.geminiQuickPhrases) ? res.geminiQuickPhrases : [];
                this.frame.postMessage({ action: 'RESTORE_QUICK_PHRASES', payload: phrases });
            });
            return;
        }

        if (action === 'GET_SUMMARY_PROMPT') {
            chrome.storage.local.get(['geminiSummaryPrompt'], (res) => {
                const prompt = res.geminiSummaryPrompt || '请总结这个网页的主要内容';
                this.frame.postMessage({ action: 'RESTORE_SUMMARY_PROMPT', payload: prompt });
            });
            return;
        }

        // 6. Data Setters (Sync to Storage & Cache)
        if (action === 'SAVE_SESSIONS') this.state.save('geminiSessions', payload);
        if (action === 'SAVE_SHORTCUTS') this.state.save('geminiShortcuts', payload);
        if (action === 'SAVE_MODEL') this.state.save('geminiModel', payload);
        if (action === 'SAVE_THEME') this.state.save('geminiTheme', payload);
        if (action === 'SAVE_LANGUAGE') this.state.save('geminiLanguage', payload);
        if (action === 'SAVE_TEXT_SELECTION') this.state.save('geminiTextSelectionEnabled', payload);
        if (action === 'SAVE_IMAGE_TOOLS') this.state.save('geminiImageToolsEnabled', payload);
        if (action === 'SAVE_SIDEBAR_BEHAVIOR') this.state.save('geminiSidebarBehavior', payload);
        if (action === 'SAVE_PROMPT_DRAFT') this.state.save('geminiPromptDraft', payload);
        if (action === 'SAVE_ACCOUNT_INDICES') this.state.save('geminiAccountIndices', payload);
        if (action === 'SAVE_QUICK_PHRASES') this.state.save('geminiQuickPhrases', payload);
        if (action === 'SAVE_SUMMARY_PROMPT') this.state.save('geminiSummaryPrompt', payload);
        if (action === 'SAVE_CONNECTION_SETTINGS') {
            this.state.save('geminiProvider', payload.provider);
            // Official
            this.state.save('geminiUseOfficialApi', payload.provider === 'official'); // Maintain legacy bool for now
            this.state.save('geminiOfficialBaseUrl', payload.officialBaseUrl || '');
            this.state.save('geminiApiKey', payload.apiKey);
            this.state.save('geminiThinkingLevel', payload.thinkingLevel);
            this.state.save('geminiOfficialModel', payload.officialModel || '');
            // OpenAI - Multi-config
            this.state.save('geminiOpenaiConfigs', Array.isArray(payload.openaiConfigs) ? payload.openaiConfigs : []);
            this.state.save('geminiOpenaiActiveConfigId', payload.openaiActiveConfigId || null);
            // OpenAI - Legacy single fields (from active config for backward compat)
            this.state.save('geminiOpenaiBaseUrl', payload.openaiBaseUrl);
            this.state.save('geminiOpenaiApiKey', payload.openaiApiKey);
            this.state.save('geminiOpenaiModel', payload.openaiModel);
            // Document Processing (OCR)
            this.state.save('geminiDocProcessingEnabled', payload.docProcessingEnabled === true);
            this.state.save('geminiDocProcessingProvider', payload.docProcessingProvider || 'mistral');
            this.state.save('geminiDocProcessingBaseUrl', payload.docProcessingBaseUrl || 'https://api.mistral.ai/v1/ocr');
            this.state.save('geminiDocProcessingApiKey', payload.docProcessingApiKey || '');
            this.state.save('geminiDocProcessingModel', payload.docProcessingModel || 'mistral-ocr-latest');
            // MCP - Multi-select support
            this.state.save('geminiMcpEnabled', payload.mcpEnabled === true);
            this.state.save('geminiMcpTransport', payload.mcpTransport || "sse");
            this.state.save('geminiMcpServerUrl', payload.mcpServerUrl || "");
            this.state.save('geminiMcpServers', Array.isArray(payload.mcpServers) ? payload.mcpServers : []);
            this.state.save('geminiMcpActiveServerId', payload.mcpActiveServerId || null);
            this.state.save('geminiMcpActiveServerIds', Array.isArray(payload.mcpActiveServerIds) ? payload.mcpActiveServerIds : []);
        }
    }

    handleRuntimeMessage(message) {
        console.log('[Chubby Cat Bridge] Received runtime message:', message.action);

        if (message.action === 'SESSIONS_UPDATED') {
            this.state.updateSessions(message.sessions);
            this.frame.postMessage({
                action: 'RESTORE_SESSIONS',
                payload: message.sessions
            });
            return;
        }

        // Forward all other background messages to sandbox (e.g. GEMINI_STREAM_UPDATE)
        console.log('[Chubby Cat Bridge] Forwarding to sandbox:', message.action);
        this.frame.postMessage({
            action: 'BACKGROUND_MESSAGE',
            payload: message
        });
    }

    /**
     * Save chat content as Markdown file using chrome.downloads API
     */
    async saveChatMarkdown(payload) {
        const { content, filename, isUpdate, sessionId } = payload;

        try {
            // Create blob and data URL
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const dataUrl = await this.blobToDataUrl(blob);

            // Use chrome.downloads to save the file
            chrome.downloads.download({
                url: dataUrl,
                filename: `Chubby Cat/${filename}`,
                saveAs: false,
                conflictAction: isUpdate ? 'overwrite' : 'uniquify'
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    this.frame.postMessage({
                        action: 'SAVE_CHAT_RESULT',
                        success: false,
                        error: chrome.runtime.lastError.message,
                        sessionId
                    });
                    return;
                }

                // Listen for download completion
                const onChanged = (delta) => {
                    if (delta.id !== downloadId) return;

                    if (delta.state?.current === 'complete') {
                        chrome.downloads.onChanged.removeListener(onChanged);
                        this.frame.postMessage({
                            action: 'SAVE_CHAT_RESULT',
                            success: true,
                            filename,
                            isUpdate,
                            sessionId
                        });
                    } else if (delta.state?.current === 'interrupted' || delta.error) {
                        chrome.downloads.onChanged.removeListener(onChanged);
                        this.frame.postMessage({
                            action: 'SAVE_CHAT_RESULT',
                            success: false,
                            error: delta.error?.current || 'Download interrupted',
                            sessionId
                        });
                    }
                };

                chrome.downloads.onChanged.addListener(onChanged);
            });
        } catch (err) {
            this.frame.postMessage({
                action: 'SAVE_CHAT_RESULT',
                success: false,
                error: err.message || 'Unknown error',
                sessionId
            });
        }
    }

    /**
     * Convert blob to data URL
     */
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
