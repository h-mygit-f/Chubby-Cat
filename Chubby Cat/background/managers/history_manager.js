
// background/managers/history_manager.js
import { generateUUID } from '../../lib/utils.js';
import { applyStoragePolicy, STORAGE_POLICY_DEFAULTS } from './storage_policy.js';

async function enforceStoragePolicy(sessions) {
    const fallbackQuotaBytes = STORAGE_POLICY_DEFAULTS.defaultQuotaBytes;
    const quotaBytes = typeof chrome?.storage?.local?.QUOTA_BYTES === 'number'
        ? chrome.storage.local.QUOTA_BYTES
        : fallbackQuotaBytes;
    const thresholdBytes = Math.floor(quotaBytes * STORAGE_POLICY_DEFAULTS.storageThresholdRatio);

    let applyStorageThreshold = false;
    try {
        const usageBytes = await chrome.storage.local.getBytesInUse(null);
        applyStorageThreshold = usageBytes >= thresholdBytes;
    } catch (e) {
        applyStorageThreshold = true;
    }

    return applyStoragePolicy(sessions, {
        ...STORAGE_POLICY_DEFAULTS,
        storageThresholdBytes: applyStorageThreshold ? thresholdBytes : Infinity
    });
}

/**
 * Saves a completed interaction to the chat history in local storage.
 * @param {string} text - The user's prompt.
 * @param {object} result - The result object from the session manager.
 * @param {Array|object} filesObj - Optional file data { base64 } or array of such objects.
 * @returns {object} The new session object or null on error.
 */
export async function saveToHistory(text, result, filesObj = null) {
    try {
        const { geminiSessions = [] } = await chrome.storage.local.get(['geminiSessions']);
        
        const sessionId = generateUUID();
        const title = text.length > 30 ? text.substring(0, 30) + "..." : text;

        // Normalize image data to array of base64 strings
        let storedImages = null;
        if (filesObj) {
            if (Array.isArray(filesObj)) {
                storedImages = filesObj.map(f => f.base64);
            } else if (filesObj.base64) {
                storedImages = [filesObj.base64];
            }
        }

        const newSession = {
            id: sessionId,
            title: title || "Quick Ask",
            timestamp: Date.now(),
            messages: [
                {
                    role: 'user',
                    text: text,
                    image: storedImages // Now stores array of base64 strings
                },
                {
                    role: 'ai',
                    text: result.text,
                    thoughts: result.thoughts, // Save thoughts if present
                    generatedImages: result.images, // Save generated images
                    thoughtSignature: result.thoughtSignature // Save context signature for Gemini 3
                }
            ],
            context: result.context
        };

        geminiSessions.unshift(newSession);
        const policy = await enforceStoragePolicy(geminiSessions);
        const nextSessions = policy.sessions;
        await chrome.storage.local.set({ geminiSessions: nextSessions });
        
        // Notify Sidepanel to reload if open
        chrome.runtime.sendMessage({ 
            action: "SESSIONS_UPDATED", 
            sessions: nextSessions 
        }).catch(() => {}); 
        
        return newSession;
    } catch(e) {
        console.error("Error saving history:", e);
        return null;
    }
}

/**
 * Appends an AI response to an existing session in local storage.
 * Critical for ensuring history is saved even if the UI is closed during generation.
 * @param {string} sessionId 
 * @param {object} result 
 */
export async function appendAiMessage(sessionId, result) {
    try {
        const { geminiSessions = [] } = await chrome.storage.local.get(['geminiSessions']);
        const sessionIndex = geminiSessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
            const session = geminiSessions[sessionIndex];
            
            session.messages.push({
                role: 'ai',
                text: result.text,
                thoughts: result.thoughts,
                generatedImages: result.images,
                thoughtSignature: result.thoughtSignature // Save context signature for Gemini 3
            });
            session.context = result.context; // Update context
            session.timestamp = Date.now();
            
            // Move to top
            geminiSessions.splice(sessionIndex, 1);
            geminiSessions.unshift(session);

            const policy = await enforceStoragePolicy(geminiSessions);
            const nextSessions = policy.sessions;
            await chrome.storage.local.set({ geminiSessions: nextSessions });
            
            chrome.runtime.sendMessage({ 
                action: "SESSIONS_UPDATED", 
                sessions: nextSessions 
            }).catch(() => {});
            
            return true;
        }
        return false;
    } catch (e) {
        console.error("Error appending history:", e);
        return false;
    }
}

/**
 * Appends a User message (or Tool Output) to an existing session.
 * Used for the automated browser control loop.
 * @param {string} sessionId 
 * @param {string} text 
 * @param {Array} images - Optional array of base64 image strings
 * @param {object} options
 * @param {boolean} options.isToolOutput
 */
export async function appendUserMessage(sessionId, text, images = null, options = {}) {
    try {
        const { geminiSessions = [] } = await chrome.storage.local.get(['geminiSessions']);
        const sessionIndex = geminiSessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
            const session = geminiSessions[sessionIndex];
            const message = {
                role: 'user',
                text: text,
                image: images // Store image array if present
            };
            if (options && options.isToolOutput === true) {
                message.isToolOutput = true;
            }

            session.messages.push(message);
            session.timestamp = Date.now();
            
            // Move to top
            geminiSessions.splice(sessionIndex, 1);
            geminiSessions.unshift(session);

            const policy = await enforceStoragePolicy(geminiSessions);
            const nextSessions = policy.sessions;
            await chrome.storage.local.set({ geminiSessions: nextSessions });
            
            chrome.runtime.sendMessage({ 
                action: "SESSIONS_UPDATED", 
                sessions: nextSessions 
            }).catch(() => {});
            
            return true;
        }
        return false;
    } catch (e) {
        console.error("Error appending user message:", e);
        return false;
    }
}
