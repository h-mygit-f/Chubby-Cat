// sandbox/ui/settings/sections/floating_tool.js

export class FloatingToolSection {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};
        this.queryElements();
        this.bindEvents();
    }

    queryElements() {
        const get = (id) => document.getElementById(id);
        this.elements = {
            floatingToolToggle: get('floating-tool-toggle'),
            floatingToolAction: get('floating-tool-action'),
            summaryPromptInput: get('summary-prompt-input'),
            summaryPromptContainer: get('summary-prompt-container')
        };
    }

    bindEvents() {
        const { floatingToolToggle, floatingToolAction, summaryPromptInput } = this.elements;

        if (floatingToolToggle) {
            floatingToolToggle.addEventListener('change', () => {
                this.fire('onFloatingToolSettingsChange', this.getSettingsData());
            });
        }

        if (floatingToolAction) {
            floatingToolAction.addEventListener('change', (e) => {
                this.applyActionState(e.target.value);
                this.fire('onFloatingToolSettingsChange', this.getSettingsData());
            });
        }

        if (summaryPromptInput) {
            // Debounce save on input
            let saveTimeout = null;
            summaryPromptInput.addEventListener('input', (e) => {
                if (saveTimeout) clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.fire('onSummaryPromptChange', e.target.value.trim());
                }, 500);
            });
            // Also save on blur
            summaryPromptInput.addEventListener('blur', (e) => {
                if (saveTimeout) clearTimeout(saveTimeout);
                this.fire('onSummaryPromptChange', e.target.value.trim());
            });
        }
    }

    applyActionState(action) {
        const isSummary = action !== 'open_sidebar';
        const { summaryPromptInput, summaryPromptContainer } = this.elements;

        if (summaryPromptInput) {
            summaryPromptInput.disabled = !isSummary;
        }
        if (summaryPromptContainer) {
            summaryPromptContainer.style.opacity = isSummary ? '1' : '0.6';
        }
    }

    setSettings({ enabled, action } = {}) {
        if (this.elements.floatingToolToggle) {
            this.elements.floatingToolToggle.checked = enabled !== false;
        }
        if (this.elements.floatingToolAction) {
            const nextAction = action || 'summary';
            this.elements.floatingToolAction.value = nextAction;
            this.applyActionState(nextAction);
        }
    }

    setSummaryPrompt(val) {
        if (this.elements.summaryPromptInput) {
            this.elements.summaryPromptInput.value = val || '';
        }
    }

    getSettingsData() {
        const { floatingToolToggle, floatingToolAction } = this.elements;
        return {
            enabled: floatingToolToggle ? floatingToolToggle.checked : true,
            action: floatingToolAction ? floatingToolAction.value : 'summary'
        };
    }

    getData() {
        const { summaryPromptInput } = this.elements;
        return {
            ...this.getSettingsData(),
            summaryPrompt: summaryPromptInput ? summaryPromptInput.value : ''
        };
    }

    fire(event, data) {
        if (this.callbacks[event]) this.callbacks[event](data);
    }
}
