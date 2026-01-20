// sandbox/core/image_utils.js

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_COMPRESSION_OPTIONS = {
    maxDimension: 2048,
    quality: 0.85,
    minBytes: 300 * 1024
};

export function normalizeImageType(type) {
    if (!type) return '';
    const lowered = type.toLowerCase();
    if (lowered === 'image/jpg') return 'image/jpeg';
    return lowered;
}

export function getDataUrlMimeType(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return '';
    const match = dataUrl.match(/^data:(.*?);base64,/);
    return match ? match[1] : '';
}

export function estimateDataUrlBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return 0;
    const base64Match = dataUrl.match(/^data:.*?;base64,(.*)$/);
    const base64 = base64Match ? base64Match[1] : dataUrl;
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function isUploadSizeAllowed(bytes, maxBytes = MAX_UPLOAD_BYTES) {
    return typeof bytes === 'number' && bytes <= maxBytes;
}

export function isCompressibleImageType(type) {
    const normalized = normalizeImageType(type);
    return normalized === 'image/jpeg'
        || normalized === 'image/png'
        || normalized === 'image/webp';
}

export function calculateTargetDimensions(width, height, maxDimension) {
    if (!width || !height || !maxDimension) {
        return { width, height, scale: 1 };
    }
    if (width <= maxDimension && height <= maxDimension) {
        return { width, height, scale: 1 };
    }
    const scale = Math.min(maxDimension / width, maxDimension / height);
    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        scale
    };
}

export async function compressImageDataUrl(dataUrl, type, options = IMAGE_COMPRESSION_OPTIONS) {
    const normalizedType = normalizeImageType(type) || getDataUrlMimeType(dataUrl) || 'image/jpeg';
    const outputType = normalizedType === 'image/png' ? 'image/png' : normalizedType === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const quality = outputType === 'image/png' ? undefined : options.quality;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const { width, height } = calculateTargetDimensions(img.width, img.height, options.maxDimension);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context unavailable'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            try {
                const nextDataUrl = canvas.toDataURL(outputType, quality);
                resolve({ base64: nextDataUrl, type: outputType });
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = dataUrl;
    });
}
