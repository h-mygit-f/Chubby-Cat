// services/providers/grok.js

const GROK_BASE_URL = 'https://grok.com';
const GROK_CHAT_ENDPOINT = `${GROK_BASE_URL}/rest/app-chat/conversations/new`;
const GROK_UPLOAD_ENDPOINT = `${GROK_BASE_URL}/rest/app-chat/upload-file`;

const FILTERED_TAGS = ['xaiartifact', 'xai:tool_usage_card', 'grok:render'];

const MODEL_CONFIG = {
    'grok-3-fast': {
        grokModel: ['grok-3', 'MODEL_MODE_FAST']
    },
    'grok-4-fast': {
        grokModel: ['grok-4-mini-thinking-tahoe', 'MODEL_MODE_GROK_4_MINI_THINKING']
    },
    'grok-4': {
        grokModel: ['grok-4', 'MODEL_MODE_FAST']
    },
    'grok-4.1-thinking': {
        grokModel: ['grok-4-1-thinking-1129', 'MODEL_MODE_AUTO']
    },
    'grok-imagine-0.9': {
        grokModel: ['grok-3', 'MODEL_MODE_FAST'],
        isVideoModel: true
    }
};

function randomString(length, lettersOnly = true) {
    const chars = lettersOnly
        ? 'abcdefghijklmnopqrstuvwxyz'
        : 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateStatsigId() {
    const rand = Math.random() > 0.5
        ? randomString(5, false)
        : randomString(10);

    const msg = Math.random() > 0.5
        ? `e:TypeError: Cannot read properties of null (reading 'children['${rand}']')`
        : `e:TypeError: Cannot read properties of undefined (reading '${rand}')`;

    return btoa(msg);
}

function makeRequestId() {
    if (crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const rand = Math.random() * 16 | 0;
        const value = char === 'x' ? rand : (rand & 0x3 | 0x8);
        return value.toString(16);
    });
}

function getHeaders(pathname = '/rest/app-chat/conversations/new') {
    return {
        'Accept': '*/*',
        'Content-Type': pathname.includes('upload-file')
            ? 'text/plain;charset=UTF-8'
            : 'application/json',
        'x-statsig-id': generateStatsigId(),
        'x-xai-request-id': makeRequestId()
    };
}

function parseDataUrl(dataUrl, fallbackType) {
    if (!dataUrl) {
        return { data: '', mimeType: fallbackType || 'image/png' };
    }

    if (dataUrl.startsWith('data:')) {
        const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
            return {
                data: match[2],
                mimeType: match[1] || fallbackType || 'image/png'
            };
        }
    }

    return { data: dataUrl, mimeType: fallbackType || 'image/png' };
}

function getFileExtension(mimeType) {
    if (!mimeType) return 'png';
    const parts = mimeType.split('/');
    return parts[1] || 'png';
}

function resolveModel(modelName) {
    const config = MODEL_CONFIG[modelName];
    if (config) {
        return {
            model: config.grokModel[0],
            mode: config.grokModel[1],
            isVideoModel: config.isVideoModel === true
        };
    }

    return {
        model: modelName || 'grok-4',
        mode: 'MODEL_MODE_FAST',
        isVideoModel: false
    };
}

function buildConversationText(systemInstruction, history, prompt) {
    const lines = [];

    if (systemInstruction) {
        lines.push(`System: ${systemInstruction}`);
    }

    if (Array.isArray(history)) {
        history.forEach((msg) => {
            const role = msg.role === 'ai' ? 'Assistant' : 'User';
            const text = (msg.text || '').trim();
            if (text) {
                lines.push(`${role}: ${text}`);
            }
        });
    }

    if (prompt) {
        lines.push(`User: ${prompt}`);
    }

    return lines.join('\n');
}

function buildPayload(message, model, mode, fileIds, isVideoModel) {
    const payload = {
        temporary: true,
        modelName: model,
        message: message,
        fileAttachments: fileIds,
        imageAttachments: [],
        disableSearch: false,
        enableImageGeneration: true,
        returnImageBytes: false,
        returnRawGrokInXaiRequest: false,
        enableImageStreaming: true,
        imageGenerationCount: 2,
        forceConcise: false,
        toolOverrides: {},
        enableSideBySide: true,
        sendFinalMetadata: true,
        isReasoning: false,
        webpageUrls: [],
        disableTextFollowUps: true,
        responseMetadata: { requestModelDetails: { modelId: model } },
        disableMemory: false,
        forceSideBySide: false,
        modelMode: mode,
        isAsyncChat: false
    };

    if (isVideoModel) {
        payload.toolOverrides = { ...payload.toolOverrides, videoGen: true };
    }

    return payload;
}

async function uploadGrokFile(file, signal) {
    const base64 = file?.base64 || '';
    const parsed = parseDataUrl(base64, file?.type);

    if (!parsed.data) {
        throw new Error('Invalid file data for Grok upload.');
    }

    const mimeType = parsed.mimeType || 'image/png';
    const extension = getFileExtension(mimeType);
    const fileName = file?.name || `image.${extension}`;

    const payload = {
        fileName: fileName,
        fileMimeType: mimeType,
        content: parsed.data
    };

    const response = await fetch(GROK_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: getHeaders('/rest/app-chat/upload-file'),
        body: JSON.stringify(payload),
        credentials: 'include',
        referrer: GROK_BASE_URL,
        mode: 'cors',
        signal
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Grok upload failed (${response.status}): ${text}`);
    }

    const result = await response.json();
    return {
        fileId: result.fileMetadataId || result.fileId || result.id || null,
        fileUri: result.fileUri || result.uri || null
    };
}

function extractImageUrls(result, images, seen) {
    if (!result || typeof result !== 'object') return;

    const pushUrl = (url) => {
        if (typeof url !== 'string' || !url.startsWith('http')) return;
        if (seen.has(url)) return;
        seen.add(url);
        images.push({ url, alt: 'Generated Image' });
    };

    pushUrl(result.fileUri);
    pushUrl(result.fileUrl);
    pushUrl(result.imageUri);
    pushUrl(result.imageUrl);
    if (result.image && typeof result.image === 'object') {
        pushUrl(result.image.url);
        pushUrl(result.image.fileUri);
    }

    if (Array.isArray(result.images)) {
        result.images.forEach((img) => {
            if (typeof img === 'string') {
                pushUrl(img);
            } else if (img && typeof img === 'object') {
                pushUrl(img.url || img.fileUri || img.imageUrl);
            }
        });
    }
}

async function readStream(reader, onUpdate) {
    const decoder = new TextDecoder();
    let buffer = '';

    let text = '';
    let thoughts = '';
    const images = [];
    const seenImages = new Set();

    const notify = () => {
        if (onUpdate) {
            onUpdate(text, thoughts || null);
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let jsonStr = trimmed;
            if (jsonStr.startsWith('data:')) {
                jsonStr = jsonStr.slice(5).trim();
            }

            if (!jsonStr || jsonStr === '[DONE]') continue;

            let data;
            try {
                data = JSON.parse(jsonStr);
            } catch (e) {
                continue;
            }

            const result = data?.result?.response || data?.response || data;
            const token = result?.token ?? result?.text ?? null;

            if (typeof token === 'string' && !FILTERED_TAGS.some(tag => token.includes(tag))) {
                let content = token;
                if (result?.messageTag === 'header') {
                    content = `\n\n${content}\n\n`;
                }

                if (result?.isThinking === true) {
                    thoughts += content;
                } else {
                    text += content;
                }

                notify();
            }

            extractImageUrls(result, images, seenImages);
        }
    }

    const tail = buffer.trim();
    if (tail) {
        let jsonStr = tail.startsWith('data:') ? tail.slice(5).trim() : tail;
        if (jsonStr && jsonStr !== '[DONE]') {
            try {
                const data = JSON.parse(jsonStr);
                const result = data?.result?.response || data?.response || data;
                const token = result?.token ?? result?.text ?? null;
                if (typeof token === 'string' && !FILTERED_TAGS.some(tag => token.includes(tag))) {
                    if (result?.isThinking === true) {
                        thoughts += token;
                    } else {
                        text += token;
                    }
                }
                extractImageUrls(result, images, seenImages);
            } catch (e) {
                // Ignore trailing buffer parse errors
            }
        }
    }

    return {
        text,
        thoughts: thoughts || null,
        images
    };
}

export async function sendGrokMessage(prompt, systemInstruction, history, modelName, files, signal, onUpdate) {
    const { model, mode, isVideoModel } = resolveModel(modelName);
    const message = buildConversationText(systemInstruction, history, prompt);

    let fileIds = [];
    if (Array.isArray(files) && files.length > 0) {
        const uploads = await Promise.all(files.map((file) => uploadGrokFile(file, signal)));
        fileIds = uploads.map(u => u.fileId).filter(Boolean);
    }

    const payload = buildPayload(message, model, mode, fileIds, isVideoModel);

    const response = await fetch(GROK_CHAT_ENDPOINT, {
        method: 'POST',
        headers: getHeaders('/rest/app-chat/conversations/new'),
        body: JSON.stringify(payload),
        credentials: 'include',
        referrer: GROK_BASE_URL,
        mode: 'cors',
        signal
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Grok request failed (${response.status}): ${text}`);
    }

    if (!response.body) {
        const json = await response.json();
        return {
            text: json?.result?.response?.text || '',
            thoughts: null,
            images: []
        };
    }

    const reader = response.body.getReader();
    return await readStream(reader, onUpdate);
}
