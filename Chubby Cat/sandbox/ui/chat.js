
// ui_chat.js -> sandbox/ui/chat.js
import { t } from '../core/i18n.js';
import { copyToClipboard } from '../render/clipboard.js';

export class ChatController {
    constructor(elements) {
        this.historyDiv = elements.historyDiv;
        this.statusDiv = elements.statusDiv;
        this.inputFn = elements.inputFn;
        this.sendBtn = elements.sendBtn;
        this.pageContextBtn = document.getElementById('page-context-btn');
        this._initialFocusDone = false;
        this._initialFocusQueued = false;
        this._handleVisibilityFocus = this._handleVisibilityFocus.bind(this);
        this._handleWindowFocus = this._handleWindowFocus.bind(this);
        this._syncFooterSpacing = this._syncFooterSpacing.bind(this);
        this._footerResizeObserver = null;
        this.footerEl = document.querySelector('.footer');

        // Debounce timer for saving prompt draft
        this._savePromptTimer = null;

        this.initListeners();
        this.scheduleInitialFocus();
        this._initFooterSpacing();
    }

    initListeners() {
        // Auto-resize Textarea and persist input content
        if (this.inputFn) {
            this.inputFn.addEventListener('input', () => {
                this.inputFn.style.height = 'auto';
                this.inputFn.style.height = this.inputFn.scrollHeight + 'px';

                // Debounced save to prevent excessive storage writes
                clearTimeout(this._savePromptTimer);
                this._savePromptTimer = setTimeout(() => {
                    this._savePromptDraft();
                }, 300); // 300ms debounce delay
            });
        }

        // Code Block Copy Delegation
        if (this.historyDiv) {
            this.historyDiv.addEventListener('click', async (e) => {
                const btn = e.target.closest('.copy-code-btn');
                if (!btn) return;

                const wrapper = btn.closest('.code-block-wrapper');
                const codeEl = wrapper.querySelector('code');
                if (!codeEl) return;

                try {
                    await copyToClipboard(codeEl.textContent);

                    // Visual Feedback
                    const originalHtml = btn.innerHTML;
                    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Copied</span>`;

                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy code', err);
                }
            });
        }
    }

    _initFooterSpacing() {
        if (!this.historyDiv || !this.footerEl) return;

        this._syncFooterSpacing();

        if (typeof ResizeObserver !== 'undefined') {
            this._footerResizeObserver = new ResizeObserver(() => {
                this._syncFooterSpacing();
            });
            this._footerResizeObserver.observe(this.footerEl);
        }

        window.addEventListener('resize', this._syncFooterSpacing);
    }

    _syncFooterSpacing() {
        if (!this.historyDiv || !this.footerEl) return;
        const footerHeight = Math.ceil(this.footerEl.getBoundingClientRect().height);
        if (!footerHeight) return;
        const offset = footerHeight + 16;
        this.historyDiv.style.setProperty('--chat-footer-offset', `${offset}px`);
    }

    focusInputAtStart() {
        if (!this.inputFn) return;
        const input = this.inputFn;
        try {
            input.focus({ preventScroll: true });
        } catch (err) {
            input.focus();
        }
        if (typeof input.setSelectionRange === 'function') {
            try {
                input.setSelectionRange(0, 0);
            } catch (err) {
                // Ignore selection errors for unsupported input states.
            }
        }
        input.scrollTop = 0;
    }

    scheduleInitialFocus() {
        if (this._initialFocusQueued) return;
        this._initialFocusQueued = true;
        const delays = [0, 50, 150, 300, 600];
        delays.forEach((delay) => {
            setTimeout(() => this._attemptInitialFocus(), delay);
        });
        document.addEventListener('visibilitychange', this._handleVisibilityFocus);
        window.addEventListener('focus', this._handleWindowFocus);
    }

    _attemptInitialFocus() {
        if (this._initialFocusDone || !this.inputFn) return;
        const active = document.activeElement;
        if (active && active !== document.body && active !== document.documentElement && active !== this.inputFn) {
            return;
        }
        this.focusInputAtStart();
        if (document.activeElement === this.inputFn) {
            this._markInitialFocusDone();
        }
    }

    _handleVisibilityFocus() {
        if (document.visibilityState === 'visible') {
            this._attemptInitialFocus();
        }
    }

    _handleWindowFocus() {
        this._attemptInitialFocus();
    }

    _markInitialFocusDone() {
        this._initialFocusDone = true;
        document.removeEventListener('visibilitychange', this._handleVisibilityFocus);
        window.removeEventListener('focus', this._handleWindowFocus);
    }

    /**
     * Save the current prompt draft to storage via parent window messaging
     * Saves both non-empty and empty content (to clear storage when input is cleared)
     */
    _savePromptDraft() {
        if (!this.inputFn) return;
        const content = this.inputFn.value;
        // Always save (including empty string to clear storage)
        window.parent.postMessage({ action: 'SAVE_PROMPT_DRAFT', payload: content }, '*');
    }

    /**
     * Restore prompt draft from storage
     * @param {string} content - The saved draft content to restore
     */
    restorePromptDraft(content) {
        if (!this.inputFn || !content) return;
        this.inputFn.value = content;
        // Trigger resize to match content height
        this.inputFn.style.height = 'auto';
        this.inputFn.style.height = this.inputFn.scrollHeight + 'px';
    }

    updateStatus(text) {
        if (this.statusDiv) {
            this.statusDiv.innerText = text;
        }
    }

    clear() {
        if (this.historyDiv) this.historyDiv.innerHTML = '';
    }

    scrollToBottom() {
        if (this.historyDiv) {
            setTimeout(() => {
                // Scroll to the start of the last message to ensure visibility from the beginning
                const lastMsg = this.historyDiv.lastElementChild;
                if (lastMsg) {
                    this.historyDiv.scrollTo({
                        top: lastMsg.offsetTop - 20,
                        behavior: 'smooth'
                    });
                } else {
                    this.historyDiv.scrollTop = this.historyDiv.scrollHeight;
                }
            }, 50);
        }
    }

    resetInput() {
        if (this.inputFn) {
            this.inputFn.value = '';
            this.inputFn.style.height = 'auto'; // Reset height only once
            this.inputFn.focus();
            // Clear the saved draft when input is reset (message sent)
            this._savePromptDraft();
        }
    }

    togglePageContext(isActive) {
        if (this.pageContextBtn) {
            this.pageContextBtn.classList.toggle('active', isActive);
        }
    }

    setLoading(isLoading) {
        // Toggle button between Send and Stop
        if (isLoading) {
            this.updateStatus(""); // Clear status text, only show spinner
            if (this.statusDiv) this.statusDiv.classList.add('thinking');

            if (this.sendBtn) {
                // Stop Icon (Square)
                this.sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>';
                this.sendBtn.title = t('stopGenerating');
                this.sendBtn.classList.add('generating');
            }
        } else {
            this.updateStatus("");
            if (this.statusDiv) this.statusDiv.classList.remove('thinking');

            if (this.sendBtn) {
                // Send Icon (Paper plane)
                this.sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
                this.sendBtn.title = t('sendMessage');
                this.sendBtn.disabled = false;
                this.sendBtn.classList.remove('generating');
            }
        }
    }
}
