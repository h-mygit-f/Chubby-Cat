// background/managers/storage_policy.js

export const STORAGE_POLICY_DEFAULTS = {
    maxSessions: 100,
    softLimitRatio: 0.9,
    cleanupTargetRatio: 0.85,
    storageThresholdRatio: 0.8,
    defaultQuotaBytes: 50 * 1024 * 1024
};

export function estimateBytes(value) {
    try {
        const json = JSON.stringify(value);
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(json).length;
        }
        return json.length;
    } catch (e) {
        return 0;
    }
}

export function sortSessionsByTimestamp(sessions) {
    return [...(sessions || [])].sort((a, b) => {
        const aTime = typeof a?.timestamp === 'number' ? a.timestamp : 0;
        const bTime = typeof b?.timestamp === 'number' ? b.timestamp : 0;
        return bTime - aTime;
    });
}

export function applyStoragePolicy(sessions, options = {}) {
    const {
        maxSessions = STORAGE_POLICY_DEFAULTS.maxSessions,
        softLimitRatio = STORAGE_POLICY_DEFAULTS.softLimitRatio,
        cleanupTargetRatio = STORAGE_POLICY_DEFAULTS.cleanupTargetRatio,
        storageThresholdBytes = Infinity
    } = options;

    const safeMaxSessions = Math.max(1, maxSessions);
    const softLimit = Math.max(1, Math.floor(safeMaxSessions * softLimitRatio));
    const cleanupTarget = Math.max(1, Math.floor(safeMaxSessions * cleanupTargetRatio));

    let sorted = sortSessionsByTimestamp(sessions);
    const reasons = [];

    if (sorted.length > safeMaxSessions) {
        sorted = sorted.slice(0, safeMaxSessions);
        reasons.push('hard-limit');
    }

    if (sorted.length >= softLimit && sorted.length > cleanupTarget) {
        sorted = sorted.slice(0, cleanupTarget);
        reasons.push('near-limit');
    }

    let removedForStorage = false;
    if (Number.isFinite(storageThresholdBytes) && storageThresholdBytes > 0) {
        while (sorted.length > 0 && estimateBytes({ geminiSessions: sorted }) > storageThresholdBytes) {
            sorted = sorted.slice(0, sorted.length - 1);
            removedForStorage = true;
        }
        if (removedForStorage) reasons.push('storage-threshold');
    }

    return {
        sessions: sorted,
        removedCount: (sessions || []).length - sorted.length,
        reasons,
        softLimit,
        cleanupTarget
    };
}
