
// background/managers/session/settings_store.js

export async function getConnectionSettings() {
    const stored = await chrome.storage.local.get([
        'geminiProvider',
        'geminiUseOfficialApi',
        'geminiOfficialBaseUrl',
        'geminiApiKey',
        'geminiThinkingLevel',
        'geminiOfficialModel',
        'geminiOfficialModels',
        'geminiOfficialActiveModelId',
        'geminiApiKeyPointer',
        'geminiOpenaiBaseUrl',
        'geminiOpenaiApiKey',
        'geminiOpenaiModel',
        'geminiOpenaiConfigs',
        'geminiOpenaiActiveConfigId',
        'geminiDocProcessingEnabled',
        'geminiDocProcessingProvider',
        'geminiDocProcessingBaseUrl',
        'geminiDocProcessingApiKey',
        'geminiDocProcessingModel'
    ]);

    // Legacy Migration Logic
    let provider = stored.geminiProvider;
    if (!provider) {
        provider = stored.geminiUseOfficialApi === true ? 'official' : 'web';
    }

    let activeApiKey = stored.geminiApiKey || "";

    // Handle API Key Rotation (Comma separated) for Official Gemini
    if (provider === 'official' && activeApiKey.includes(',')) {
        const keys = activeApiKey.split(',').map(k => k.trim()).filter(k => k);

        if (keys.length > 0) {
            let pointer = stored.geminiApiKeyPointer || 0;

            // Reset pointer if out of bounds (e.g. keys removed)
            if (typeof pointer !== 'number' || pointer >= keys.length || pointer < 0) {
                pointer = 0;
            }

            activeApiKey = keys[pointer];

            // Advance pointer for next call
            const nextPointer = (pointer + 1) % keys.length;
            await chrome.storage.local.set({ geminiApiKeyPointer: nextPointer });

            console.log(`[Chubby Cat] Rotating Official API Key (Index: ${pointer})`);
        }
    } else {
        // Trim single key just in case
        activeApiKey = activeApiKey.trim();
    }

    const normalizeOfficialModels = (rawModels, legacyModels) => {
        const list = [];
        const pushModel = (val) => {
            const trimmed = (val || '').trim();
            if (!trimmed || list.includes(trimmed)) return;
            list.push(trimmed);
        };

        if (Array.isArray(rawModels)) {
            rawModels.forEach(m => {
                if (typeof m === 'string') return pushModel(m);
                if (m && typeof m === 'object') return pushModel(m.id || m.name || m.value || '');
            });
        }

        if (typeof legacyModels === 'string') {
            legacyModels.split(',').map(m => m.trim()).forEach(pushModel);
        }

        return list;
    };

    const officialModels = normalizeOfficialModels(
        stored.geminiOfficialModels,
        stored.geminiOfficialModel || ''
    );

    let officialActiveModelId = (stored.geminiOfficialActiveModelId || '').trim();
    if (officialActiveModelId && !officialModels.includes(officialActiveModelId)) {
        officialModels.unshift(officialActiveModelId);
    }
    if (!officialActiveModelId) {
        officialActiveModelId = officialModels[0] || '';
    }

    return {
        provider: provider,
        // Official
        officialBaseUrl: stored.geminiOfficialBaseUrl || '',
        apiKey: activeApiKey,
        thinkingLevel: stored.geminiThinkingLevel || "low",
        officialModels: officialModels,
        officialActiveModelId: officialActiveModelId,
        officialModel: officialModels.length > 0 ? officialModels.join(', ') : (stored.geminiOfficialModel || ''),
        // OpenAI (legacy single fields)
        openaiBaseUrl: stored.geminiOpenaiBaseUrl,
        openaiApiKey: stored.geminiOpenaiApiKey,
        openaiModel: stored.geminiOpenaiModel,
        // OpenAI (multi-config support)
        openaiConfigs: Array.isArray(stored.geminiOpenaiConfigs) ? stored.geminiOpenaiConfigs : [],
        openaiActiveConfigId: stored.geminiOpenaiActiveConfigId || null,
        // Document Processing (OCR)
        docProcessingEnabled: stored.geminiDocProcessingEnabled === true,
        docProcessingProvider: stored.geminiDocProcessingProvider || 'mistral',
        docProcessingBaseUrl: stored.geminiDocProcessingBaseUrl || 'https://api.mistral.ai/v1/ocr',
        docProcessingApiKey: stored.geminiDocProcessingApiKey || '',
        docProcessingModel: stored.geminiDocProcessingModel || 'mistral-ocr-latest'
    };
}
