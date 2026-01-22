
// lib/messaging.js

export function sendToBackground(payload) {
    window.parent.postMessage({
        action: 'FORWARD_TO_BACKGROUND',
        payload: payload
    }, '*');
}

export function saveSessionsToStorage(sessions) {
    window.parent.postMessage({
        action: 'SAVE_SESSIONS',
        payload: sessions
    }, '*');
}

export function saveShortcutsToStorage(shortcuts) {
    window.parent.postMessage({
        action: 'SAVE_SHORTCUTS',
        payload: shortcuts
    }, '*');
}

export function requestThemeFromStorage() {
    window.parent.postMessage({ action: 'GET_THEME' }, '*');
}

export function saveThemeToStorage(theme) {
    window.parent.postMessage({
        action: 'SAVE_THEME',
        payload: theme
    }, '*');
}

export function requestLanguageFromStorage() {
    window.parent.postMessage({ action: 'GET_LANGUAGE' }, '*');
}

export function saveLanguageToStorage(lang) {
    window.parent.postMessage({
        action: 'SAVE_LANGUAGE',
        payload: lang
    }, '*');
}

export function requestTextSelectionFromStorage() {
    window.parent.postMessage({ action: 'GET_TEXT_SELECTION' }, '*');
}

export function saveTextSelectionToStorage(enabled) {
    window.parent.postMessage({
        action: 'SAVE_TEXT_SELECTION',
        payload: enabled
    }, '*');
}

export function requestImageToolsFromStorage() {
    window.parent.postMessage({ action: 'GET_IMAGE_TOOLS' }, '*');
}

export function saveImageToolsToStorage(enabled) {
    window.parent.postMessage({
        action: 'SAVE_IMAGE_TOOLS',
        payload: enabled
    }, '*');
}

export function saveSidebarBehaviorToStorage(behavior) {
    window.parent.postMessage({
        action: 'SAVE_SIDEBAR_BEHAVIOR',
        payload: behavior
    }, '*');
}

export function requestAccountIndicesFromStorage() {
    window.parent.postMessage({ action: 'GET_ACCOUNT_INDICES' }, '*');
}

export function saveAccountIndicesToStorage(indices) {
    window.parent.postMessage({
        action: 'SAVE_ACCOUNT_INDICES',
        payload: indices
    }, '*');
}

export function requestConnectionSettingsFromStorage() {
    window.parent.postMessage({ action: 'GET_CONNECTION_SETTINGS' }, '*');
}

export function saveConnectionSettingsToStorage(data) {
    window.parent.postMessage({
        action: 'SAVE_CONNECTION_SETTINGS',
        payload: data
    }, '*');
}

export function requestQuickPhrasesFromStorage() {
    window.parent.postMessage({ action: 'GET_QUICK_PHRASES' }, '*');
}

export function saveQuickPhrasesToStorage(phrases) {
    window.parent.postMessage({
        action: 'SAVE_QUICK_PHRASES',
        payload: phrases
    }, '*');
}

export function requestSummaryPromptFromStorage() {
    window.parent.postMessage({ action: 'GET_SUMMARY_PROMPT' }, '*');
}

export function saveSummaryPromptToStorage(prompt) {
    window.parent.postMessage({
        action: 'SAVE_SUMMARY_PROMPT',
        payload: prompt
    }, '*');
}

export function requestFloatingToolSettingsFromStorage() {
    window.parent.postMessage({ action: 'GET_FLOATING_TOOL_SETTINGS' }, '*');
}

export function saveFloatingToolSettingsToStorage(settings) {
    window.parent.postMessage({
        action: 'SAVE_FLOATING_TOOL_SETTINGS',
        payload: settings
    }, '*');
}

export function requestSkillsSettingsFromStorage() {
    window.parent.postMessage({ action: 'GET_SKILLS_SETTINGS' }, '*');
}

export function saveSkillsSettingsToStorage(settings) {
    window.parent.postMessage({
        action: 'SAVE_SKILLS_SETTINGS',
        payload: settings
    }, '*');
}

export function requestSaveChat(payload) {
    window.parent.postMessage({
        action: 'SAVE_CHAT_MARKDOWN',
        payload: payload
    }, '*');
}
