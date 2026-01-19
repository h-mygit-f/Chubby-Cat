
// sandbox/ui/settings/sections/general.js

export class GeneralSection {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};
        this.queryElements();
        this.bindEvents();
    }

    queryElements() {
        const get = (id) => document.getElementById(id);
        this.elements = {
            textSelectionToggle: get('text-selection-toggle'),
            imageToolsToggle: get('image-tools-toggle'),
            accountIndicesInput: get('account-indices-input'),
            summaryPromptInput: get('summary-prompt-input'),
            sidebarRadios: document.querySelectorAll('input[name="sidebar-behavior"]')
        };
    }

    bindEvents() {
        const { textSelectionToggle, imageToolsToggle, sidebarRadios, summaryPromptInput } = this.elements;

        if (textSelectionToggle) {
            textSelectionToggle.addEventListener('change', (e) => this.fire('onTextSelectionChange', e.target.checked));
        }
        if (imageToolsToggle) {
            imageToolsToggle.addEventListener('change', (e) => this.fire('onImageToolsChange', e.target.checked));
        }
        if (sidebarRadios) {
            sidebarRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if(e.target.checked) this.fire('onSidebarBehaviorChange', e.target.value);
                });
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

    setToggles(textSelection, imageTools) {
        if (this.elements.textSelectionToggle) this.elements.textSelectionToggle.checked = textSelection;
        if (this.elements.imageToolsToggle) this.elements.imageToolsToggle.checked = imageTools;
    }

    setAccountIndices(val) {
        if (this.elements.accountIndicesInput) this.elements.accountIndicesInput.value = val || "0";
    }

    setSummaryPrompt(val) {
        if (this.elements.summaryPromptInput) {
            this.elements.summaryPromptInput.value = val || '';
        }
    }

    setSidebarBehavior(behavior) {
        if (this.elements.sidebarRadios) {
            const val = behavior || 'auto';
            this.elements.sidebarRadios.forEach(radio => {
                radio.checked = (radio.value === val);
            });
        }
    }

    getData() {
        const { textSelectionToggle, imageToolsToggle, accountIndicesInput, summaryPromptInput } = this.elements;
        return {
            textSelection: textSelectionToggle ? textSelectionToggle.checked : true,
            imageTools: imageToolsToggle ? imageToolsToggle.checked : true,
            accountIndices: accountIndicesInput ? accountIndicesInput.value : "0",
            summaryPrompt: summaryPromptInput ? summaryPromptInput.value : ""
        };
    }

    fire(event, data) {
        if (this.callbacks[event]) this.callbacks[event](data);
    }
}
