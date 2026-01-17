
// sandbox/boot/events.js
import { sendToBackground } from '../../lib/messaging.js';
import { t } from '../core/i18n.js';

export function bindAppEvents(app, ui, setResizeRef) {
    // New Chat Button (in input area)
    const newChatInputBtn = document.getElementById('new-chat-input-btn');
    if (newChatInputBtn) {
        newChatInputBtn.addEventListener('click', () => {
            // Add visual feedback animation
            newChatInputBtn.classList.add('clicked');
            setTimeout(() => newChatInputBtn.classList.remove('clicked'), 300);
            app.handleNewChat();
        });
    }

    // Tab Switcher Button
    const tabSwitcherBtn = document.getElementById('tab-switcher-btn');
    if (tabSwitcherBtn) {
        tabSwitcherBtn.addEventListener('click', () => app.handleTabSwitcher());
    }

    // Open Full Page Button
    const openFullPageBtn = document.getElementById('open-full-page-btn');
    if (openFullPageBtn) {
        openFullPageBtn.addEventListener('click', () => {
            window.parent.postMessage({ action: 'OPEN_FULL_PAGE' }, '*');
        });
    }

    // Tools Row Navigation
    const toolsRow = document.getElementById('tools-row');
    const scrollLeftBtn = document.getElementById('tools-scroll-left');
    const scrollRightBtn = document.getElementById('tools-scroll-right');

    if (toolsRow && scrollLeftBtn && scrollRightBtn) {
        scrollLeftBtn.addEventListener('click', () => {
            toolsRow.scrollBy({ left: -150, behavior: 'smooth' });
        });
        scrollRightBtn.addEventListener('click', () => {
            toolsRow.scrollBy({ left: 150, behavior: 'smooth' });
        });
    }

    // Tools

    // Browser Control (Functional Toggle)
    const browserControlBtn = document.getElementById('browser-control-btn');
    if (browserControlBtn) {
        browserControlBtn.addEventListener('click', () => {
            app.toggleBrowserControl();
            if (ui.inputFn) ui.inputFn.focus();
        });
    }

    document.getElementById('quote-btn').addEventListener('click', () => {
        sendToBackground({ action: "GET_ACTIVE_SELECTION" });
        if (ui.inputFn) ui.inputFn.focus();
    });

    document.getElementById('ocr-btn').addEventListener('click', () => {
        app.setCaptureMode('ocr');
        sendToBackground({ action: "INITIATE_CAPTURE", mode: 'ocr', source: 'sidepanel' });
        ui.updateStatus(t('selectOcr'));
    });

    document.getElementById('screenshot-translate-btn').addEventListener('click', () => {
        app.setCaptureMode('screenshot_translate');
        sendToBackground({ action: "INITIATE_CAPTURE", mode: 'screenshot_translate', source: 'sidepanel' });
        ui.updateStatus(t('selectTranslate'));
    });

    document.getElementById('snip-btn').addEventListener('click', () => {
        app.setCaptureMode('snip');
        sendToBackground({ action: "INITIATE_CAPTURE", mode: 'snip', source: 'sidepanel' });
        ui.updateStatus(t('selectSnip'));
    });

    // Page Context Toggle
    const contextBtn = document.getElementById('page-context-btn');
    if (contextBtn) {
        contextBtn.addEventListener('click', () => {
            app.togglePageContext();
            if (ui.inputFn) ui.inputFn.focus();
        });
    }

    // MCP Servers Panel is initialized separately in app.js

    // Model Selector
    const modelSelect = document.getElementById('model-select');

    // Auto-resize Logic
    const resizeModelSelect = () => {
        if (!modelSelect) return;

        // Safety: Ensure selectedIndex is valid
        if (modelSelect.selectedIndex === -1) {
            if (modelSelect.options.length > 0) modelSelect.selectedIndex = 0;
        }
        if (modelSelect.selectedIndex === -1) return;

        const tempSpan = document.createElement('span');
        Object.assign(tempSpan.style, {
            visibility: 'hidden',
            position: 'absolute',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: window.getComputedStyle(modelSelect).fontFamily,
            whiteSpace: 'nowrap'
        });
        tempSpan.textContent = modelSelect.options[modelSelect.selectedIndex].text;
        document.body.appendChild(tempSpan);
        const width = tempSpan.getBoundingClientRect().width;
        document.body.removeChild(tempSpan);
        modelSelect.style.width = `${width + 34}px`;
    };

    if (setResizeRef) setResizeRef(resizeModelSelect); // Expose for message handler

    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (!selectedOption) return;

            const selectedProvider = selectedOption.dataset.provider;
            const currentProvider = ui.getCurrentProvider ? ui.getCurrentProvider() : 'web';
            const isOpenAIConfig = selectedOption.dataset.isConfig === 'true';
            const configId = selectedOption.dataset.configId;

            // Check if this is a provider switch (cross-provider model selection)
            if (selectedProvider && selectedProvider !== currentProvider) {
                // Provider switch detected
                if (ui.handleProviderSwitch) {
                    const switched = ui.handleProviderSwitch(selectedProvider, {
                        configId: isOpenAIConfig ? configId : null
                    });
                    if (switched) {
                        // Provider was switched, update status to notify user
                        const providerNames = {
                            'web': 'Web (Free)',
                            'official': 'Official API',
                            'openai': 'Custom API'
                        };
                        ui.updateStatus(`✓ ${providerNames[selectedProvider] || selectedProvider}`);
                        // Clear status after 2 seconds
                        setTimeout(() => ui.updateStatus(''), 2000);
                    }
                }
            } else if (isOpenAIConfig && configId) {
                // Same provider (OpenAI), but different config
                if (ui.handleOpenaiConfigSwitch) {
                    ui.handleOpenaiConfigSwitch(configId);
                }
            }

            // Always notify app of model change for session tracking
            app.handleModelChange(e.target.value);

            resizeModelSelect();
        });
        // Call initial resize after a short delay to ensure fonts/styles loaded
        setTimeout(resizeModelSelect, 50);
    }

    // Input Key Handling
    const inputFn = document.getElementById('prompt');
    const sendBtn = document.getElementById('send');

    if (inputFn && sendBtn) {
        inputFn.addEventListener('keydown', (e) => {
            // Tab Cycle Models
            if (e.key === 'Tab') {
                e.preventDefault();
                if (modelSelect) {
                    const direction = e.shiftKey ? -1 : 1;
                    const newIndex = (modelSelect.selectedIndex + direction + modelSelect.length) % modelSelect.length;
                    modelSelect.selectedIndex = newIndex;
                    modelSelect.dispatchEvent(new Event('change'));
                }
                return;
            }

            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                sendBtn.click();
            }
        });

        sendBtn.addEventListener('click', () => {
            if (app.isGenerating) {
                app.handleCancel();
            } else {
                app.handleSendMessage();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (inputFn) inputFn.focus();
        }
    });

    // Regenerate Button Handler
    document.addEventListener('gemini-regenerate', () => {
        if (app && app.prompt) {
            app.prompt.regenerate();
        }
    });
}
