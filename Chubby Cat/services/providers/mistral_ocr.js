// services/providers/mistral_ocr.js

function parseFileData(file) {
    const base64 = file && file.base64 ? file.base64 : '';
    const parts = base64.split(',');
    if (parts.length === 2) {
        const mimeMatch = parts[0].match(/data:(.*?);base64/);
        return {
            data: parts[1],
            dataUrl: base64,
            mimeType: mimeMatch ? mimeMatch[1] : (file.type || 'application/octet-stream')
        };
    }
    return {
        data: base64,
        dataUrl: `data:${file.type || 'application/octet-stream'};base64,${base64}`,
        mimeType: file.type || 'application/octet-stream'
    };
}

function buildOcrDocumentPayload(file, dataUrl, mimeType) {
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf');

    if (isImage) {
        return {
            type: 'image_url',
            image_url: dataUrl
        };
    }

    if (isPdf) {
        return {
            type: 'document_url',
            document_url: dataUrl
        };
    }

    return {
        type: 'document_url',
        document_url: dataUrl
    };
}

function extractTextFromResponse(payload) {
    if (!payload) return '';

    if (typeof payload.text === 'string') return payload.text.trim();

    if (Array.isArray(payload.pages)) {
        const chunks = payload.pages
            .map((page) => page && (page.markdown || page.text || page.content))
            .filter(Boolean);
        if (chunks.length > 0) return chunks.join('\n\n').trim();
    }

    if (Array.isArray(payload.results)) {
        const chunks = payload.results
            .map((page) => page && (page.text || page.markdown || page.content))
            .filter(Boolean);
        if (chunks.length > 0) return chunks.join('\n\n').trim();
    }

    if (Array.isArray(payload.choices)) {
        const chunk = payload.choices
            .map((choice) => choice && choice.message && choice.message.content)
            .filter(Boolean)
            .join('\n\n');
        if (chunk) return chunk.trim();
    }

    if (payload.output && typeof payload.output === 'string') {
        return payload.output.trim();
    }

    return '';
}

export async function extractMistralOcrText(file, config, signal) {
    if (!file || !file.base64) throw new Error('OCR file content is missing.');
    if (!config || !config.baseUrl) throw new Error('OCR Base URL is missing.');
    if (!config.model) throw new Error('OCR model name is missing.');

    let baseUrl = config.baseUrl.trim().replace(/\/$/, '');
    if (/\/v1$/.test(baseUrl)) baseUrl = `${baseUrl}/ocr`;

    const { dataUrl, mimeType } = parseFileData(file);
    const document = buildOcrDocumentPayload(file, dataUrl, mimeType);

    const payload = {
        model: config.model,
        document: document
    };

    const headers = {
        'Content-Type': 'application/json'
    };

    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(baseUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal
    });

    if (!response.ok) {
        let errorText = await response.text();
        try {
            const errJson = JSON.parse(errorText);
            if (errJson.error && errJson.error.message) {
                errorText = errJson.error.message;
            }
        } catch (e) { }
        throw new Error(`OCR API Error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    const text = extractTextFromResponse(json);

    if (!text) {
        throw new Error('OCR response was empty.');
    }

    return text;
}
