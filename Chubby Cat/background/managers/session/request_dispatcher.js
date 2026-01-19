
// background/managers/session/request_dispatcher.js
import { sendOfficialMessage } from '../../../services/providers/official.js';
import { sendWebMessage } from '../../../services/providers/web.js';
import { sendOpenAIMessage } from '../../../services/providers/openai_compatible.js';
import { extractMistralOcrText } from '../../../services/providers/mistral_ocr.js';
import { getHistory } from './history_store.js';

export class RequestDispatcher {
    constructor(authManager) {
        this.auth = authManager;
    }

    async dispatch(request, settings, files, onUpdate, signal) {
        if (settings.provider === 'official') {
            return await this._handleOfficialRequest(request, settings, files, onUpdate, signal);
        } else if (settings.provider === 'openai') {
            return await this._handleOpenAIRequest(request, settings, files, onUpdate, signal);
        } else {
            return await this._handleWebRequest(request, files, onUpdate, signal);
        }
    }

    async _handleOfficialRequest(request, settings, files, onUpdate, signal) {
        if (!settings.apiKey) throw new Error("API Key is missing. Please check settings.");

        // Fetch History
        let history = await getHistory(request.sessionId);

        const response = await sendOfficialMessage(
            request.text,
            request.systemInstruction,
            history,
            settings.apiKey,
            request.model,
            settings.thinkingLevel,
            files,
            signal,
            onUpdate,
            settings.officialBaseUrl
        );

        return {
            action: "GEMINI_REPLY",
            text: response.text,
            thoughts: response.thoughts,
            images: response.images,
            status: "success",
            context: null, // Official API is stateless
            thoughtSignature: response.thoughtSignature
        };
    }

    async _handleOpenAIRequest(request, settings, files, onUpdate, signal) {
        // Determine the config to use
        // In multi-config mode, request.model contains a config ID (e.g., "cfg_xxx")
        // We need to resolve this to the actual configuration

        let config = null;
        const requestModel = request.model || '';

        // Check if request.model is a config ID
        if (requestModel.startsWith('cfg_') && Array.isArray(settings.openaiConfigs) && settings.openaiConfigs.length > 0) {
            // Multi-config mode: find the config by ID
            config = settings.openaiConfigs.find(c => c.id === requestModel);

            if (!config) {
                // Config ID not found, try to use active config or first config
                if (settings.openaiActiveConfigId) {
                    config = settings.openaiConfigs.find(c => c.id === settings.openaiActiveConfigId);
                }
                if (!config) {
                    config = settings.openaiConfigs[0];
                }
            }

            if (config) {
                config = {
                    providerType: config.providerType || 'openai',
                    baseUrl: config.baseUrl || '',
                    apiKey: config.apiKey || '',
                    model: config.model || '',
                    // Claude-specific options
                    maxTokens: config.maxTokens || 8192,
                    thinkingEnabled: config.thinkingEnabled === true,
                    thinkingBudget: config.thinkingBudget || 10000
                };
            }
        }

        // Fallback to legacy single-config mode
        if (!config) {
            // Legacy mode: prioritize request.model if it's a real model name
            let targetModel = requestModel;
            if (!targetModel || targetModel === 'openai_custom' || targetModel.startsWith('cfg_')) {
                // Use legacy settings
                const configuredModels = settings.openaiModel ? settings.openaiModel.split(',') : [];
                targetModel = configuredModels.length > 0 ? configuredModels[0].trim() : "";
            }

            config = {
                providerType: 'openai', // Legacy mode always uses OpenAI
                baseUrl: settings.openaiBaseUrl,
                apiKey: settings.openaiApiKey,
                model: targetModel
            };
        }

        const preprocessing = await this._maybeApplyDocumentProcessing(request, settings, files, onUpdate, signal);
        const requestText = preprocessing.text;
        const processedFiles = preprocessing.files;

        let history = await getHistory(request.sessionId);

        const response = await sendOpenAIMessage(
            requestText,
            request.systemInstruction,
            history,
            config,
            processedFiles,
            signal,
            onUpdate
        );

        return {
            action: "GEMINI_REPLY",
            text: response.text,
            thoughts: response.thoughts,
            images: response.images,
            status: "success",
            context: null
        };
    }

    async _handleWebRequest(request, files, onUpdate, signal) {
        // Ensure auth is possibly ready, though SessionManager usually handles initialization.

        let attemptCount = 0;
        const maxAttempts = Math.max(3, this.auth.accountIndices.length > 1 ? 3 : 2);

        // Concatenate System Instruction for Web Client
        let fullText = request.text;
        if (request.systemInstruction) {
            fullText = request.systemInstruction + "\n\nQuestion: " + fullText;
        }

        while (attemptCount < maxAttempts) {
            attemptCount++;

            try {
                this.auth.checkModelChange(request.model);
                const context = await this.auth.getOrFetchContext();

                const response = await sendWebMessage(
                    fullText,
                    context,
                    request.model,
                    files,
                    signal,
                    onUpdate
                );

                // Success! Update auth state
                await this.auth.updateContext(response.newContext, request.model);

                return {
                    action: "GEMINI_REPLY",
                    text: response.text,
                    thoughts: response.thoughts,
                    images: response.images,
                    status: "success",
                    context: response.newContext
                };

            } catch (err) {
                const isLoginError = err.message && (
                    err.message.includes("未登录") ||
                    err.message.includes("Not logged in") ||
                    err.message.includes("Sign in") ||
                    err.message.includes("401") ||
                    err.message.includes("403")
                );

                const isNetworkGlitch = err.message && (
                    err.message.includes("No valid response found") ||
                    err.message.includes("Network Error") ||
                    err.message.includes("Failed to fetch") ||
                    err.message.includes("Check network") ||
                    err.message.includes("429")
                );

                if ((isLoginError || isNetworkGlitch) && attemptCount < maxAttempts) {
                    const type = isLoginError ? "Auth" : "Network";
                    console.warn(`[Chubby Cat] ${type} error (${err.message}), retrying... (Attempt ${attemptCount}/${maxAttempts})`);

                    if (isLoginError || isNetworkGlitch) {
                        if (this.auth.accountIndices.length > 1) {
                            await this.auth.rotateAccount();
                        }
                        this.auth.forceContextRefresh();
                    }

                    const baseDelay = Math.pow(2, attemptCount) * 1000;
                    const jitter = Math.random() * 1000;
                    await new Promise(r => setTimeout(r, baseDelay + jitter));
                    continue;
                }

                throw err;
            }
        }
    }

    async _maybeApplyDocumentProcessing(request, settings, files, onUpdate, signal) {
        const enabled = settings.docProcessingEnabled === true;
        if (!enabled) return { text: request.text, files };

        if (!files || files.length === 0) return { text: request.text, files };

        const ocrTargets = files.filter((file) => {
            if (!file) return false;
            const type = (file.type || '').toLowerCase();
            if (type.startsWith('image/')) return true;
            if (type === 'application/pdf') return true;
            const name = (file.name || '').toLowerCase();
            return name.endsWith('.pdf');
        });

        if (ocrTargets.length === 0) return { text: request.text, files };

        const baseUrl = settings.docProcessingBaseUrl || '';
        const apiKey = settings.docProcessingApiKey || '';
        const model = settings.docProcessingModel || '';

        if (!baseUrl || !model) {
            throw new Error('Document processing model settings are incomplete. Please check the Document Translation panel.');
        }
        if (!apiKey) {
            throw new Error('Document processing API key is missing. Please configure it in settings.');
        }

        const isZh = chrome.i18n.getUILanguage().startsWith('zh');
        const statusPrefix = isZh ? '正在解析文档...' : 'Processing document...';

        const results = [];
        for (const file of ocrTargets) {
            if (onUpdate) {
                const name = file.name ? ` ${file.name}` : '';
                onUpdate(`${statusPrefix}${name}`, '');
            }
            const text = await extractMistralOcrText(file, { baseUrl, apiKey, model }, signal);
            results.push({
                name: file.name || (isZh ? '附件' : 'Attachment'),
                text
            });
        }

        const blocks = results.map((entry, idx) => {
            const label = `${idx + 1}. ${entry.name}`;
            return `${label}\n${entry.text}`;
        });

        const header = isZh ? '【文档解析结果】' : '[Document OCR Results]';
        const ocrText = `${header}\n${blocks.join('\n\n')}`;
        const nextText = request.text ? `${request.text}\n\n${ocrText}` : ocrText;

        const remainingFiles = files.filter((file) => !ocrTargets.includes(file));
        return { text: nextText, files: remainingFiles };
    }
}
