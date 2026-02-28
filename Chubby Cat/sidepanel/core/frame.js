
// sidepanel/core/frame.js

export class FrameManager {
    constructor() {
        this.iframe = document.getElementById('sandbox-frame');
        this.skeleton = document.getElementById('skeleton');
    }

    init() {
        // --- Optimization: Instant Load (Sync) ---
        // Use localStorage for Theme/Lang to avoid waiting for async chrome.storage
        const cachedTheme = localStorage.getItem('geminiTheme') || 'system';

        // Language migration: force Chinese if no explicit preference was set
        let storedLang = localStorage.getItem('geminiLanguage');
        if (!storedLang || storedLang === 'system') {
            storedLang = 'zh';
            localStorage.setItem('geminiLanguage', 'zh');
        }
        const cachedLang = storedLang;

        // Set src immediately to start loading HTML
        this.iframe.src = `../sandbox/index.html?theme=${cachedTheme}&lang=${cachedLang}`;

    }

    reveal() {
        this.iframe.classList.add('loaded');
        if (this.skeleton) this.skeleton.classList.add('hidden');
    }

    postMessage(message) {
        if (this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(message, '*');
        }
    }

    getWindow() {
        return this.iframe.contentWindow;
    }

    isWindow(sourceWindow) {
        return this.iframe.contentWindow && sourceWindow === this.iframe.contentWindow;
    }
}
