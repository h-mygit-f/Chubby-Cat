/**
 * Unit Tests for Storage Management and Upload Handling
 *
 * Run in browser console with the extension loaded:
 * const script = document.createElement('script');
 * script.src = chrome.runtime.getURL('tests/storage_management.test.js');
 * document.head.appendChild(script);
 * runStorageManagementTests();
 */

const resolveModuleUrl = (path) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        return chrome.runtime.getURL(path);
    }
    return path;
};

const loadStoragePolicy = async () => {
    const url = resolveModuleUrl('background/managers/storage_policy.js');
    return import(url);
};

const loadImageUtils = async () => {
    const url = resolveModuleUrl('sandbox/core/image_utils.js');
    return import(url);
};

const createSessions = (count, payloadSize = 0) => {
    const payload = payloadSize > 0 ? 'x'.repeat(payloadSize) : '';
    return Array.from({ length: count }, (_, i) => ({
        id: `session-${i + 1}`,
        timestamp: i + 1,
        messages: payload ? [{ role: 'user', text: payload }] : []
    }));
};

async function testHardSessionLimit() {
    const { applyStoragePolicy } = await loadStoragePolicy();
    const sessions = createSessions(120);
    const result = applyStoragePolicy(sessions, {
        maxSessions: 100,
        softLimitRatio: 1,
        cleanupTargetRatio: 1,
        storageThresholdBytes: Infinity
    });

    const correctLength = result.sessions.length === 100;
    const newestFirst = result.sessions[0].timestamp === 120;
    const oldestKept = result.sessions[99].timestamp === 21;

    const pass = correctLength && newestFirst && oldestKept;
    console.log(pass ? '✅ PASS: Hard session limit enforced' : '❌ FAIL: Hard session limit');
    return pass;
}

async function testNearLimitCleanup() {
    const { applyStoragePolicy } = await loadStoragePolicy();
    const sessions = createSessions(92);
    const result = applyStoragePolicy(sessions, {
        maxSessions: 100,
        softLimitRatio: 0.9,
        cleanupTargetRatio: 0.85,
        storageThresholdBytes: Infinity
    });

    const pass = result.sessions.length === 85;
    console.log(pass ? '✅ PASS: Near-limit cleanup enforced' : '❌ FAIL: Near-limit cleanup');
    return pass;
}

async function testStorageThresholdCleanup() {
    const { applyStoragePolicy } = await loadStoragePolicy();
    const sessions = createSessions(10, 5000);
    const result = applyStoragePolicy(sessions, {
        maxSessions: 100,
        softLimitRatio: 1,
        cleanupTargetRatio: 1,
        storageThresholdBytes: 8000
    });

    const pass = result.sessions.length < sessions.length;
    console.log(pass ? '✅ PASS: Storage threshold cleanup enforced' : '❌ FAIL: Storage threshold cleanup');
    return pass;
}

async function testEstimateDataUrlBytes() {
    const { estimateDataUrlBytes } = await loadImageUtils();
    const base64 = btoa('hello');
    const dataUrl = `data:text/plain;base64,${base64}`;
    const bytes = estimateDataUrlBytes(dataUrl);
    const pass = bytes === 5;
    console.log(pass ? '✅ PASS: Base64 size estimation' : '❌ FAIL: Base64 size estimation');
    return pass;
}

async function testImageCompressionReducesSize() {
    const { compressImageDataUrl, estimateDataUrlBytes } = await loadImageUtils();
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const original = canvas.toDataURL('image/jpeg', 0.95);
    const originalBytes = estimateDataUrlBytes(original);
    const compressed = await compressImageDataUrl(original, 'image/jpeg', {
        maxDimension: 512,
        quality: 0.75
    });
    const compressedBytes = estimateDataUrlBytes(compressed.base64);

    const pass = compressedBytes < originalBytes;
    console.log(pass ? '✅ PASS: Image compression reduces size' : '❌ FAIL: Image compression did not reduce size');
    return pass;
}

async function testUploadSizeLimit() {
    const { isUploadSizeAllowed, MAX_UPLOAD_BYTES } = await loadImageUtils();
    const pass = isUploadSizeAllowed(MAX_UPLOAD_BYTES) && !isUploadSizeAllowed(MAX_UPLOAD_BYTES + 1);
    console.log(pass ? '✅ PASS: Upload size limit enforced' : '❌ FAIL: Upload size limit not enforced');
    return pass;
}

async function runStorageManagementTests() {
    console.log('=== Storage Management & Upload Tests ===\n');

    const results = [];
    results.push(await testHardSessionLimit());
    results.push(await testNearLimitCleanup());
    results.push(await testStorageThresholdCleanup());
    results.push(await testEstimateDataUrlBytes());
    results.push(await testImageCompressionReducesSize());
    results.push(await testUploadSizeLimit());

    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} tests passed`);
    return passed === results.length;
}

if (typeof window !== 'undefined') {
    console.log('Run runStorageManagementTests() to execute tests');
}
