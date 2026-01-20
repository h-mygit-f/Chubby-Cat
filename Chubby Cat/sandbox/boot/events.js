
// sandbox/boot/events.js
import { sendToBackground, requestSaveChat } from '../../lib/messaging.js';
import { t } from '../core/i18n.js';
import { sessionToMarkdown, generateFilename } from '../../lib/markdown_export.js';

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

    const quoteBtn = document.getElementById('quote-btn');
    if (quoteBtn) {
        quoteBtn.addEventListener('click', () => {
            sendToBackground({ action: "GET_ACTIVE_SELECTION" });
            if (ui.inputFn) ui.inputFn.focus();
        });
    }

    const ocrBtn = document.getElementById('ocr-btn');
    if (ocrBtn) {
        ocrBtn.addEventListener('click', () => {
            app.setCaptureMode('ocr');
            sendToBackground({ action: "INITIATE_CAPTURE", mode: 'ocr', source: 'sidepanel' });
            ui.updateStatus(t('selectOcr'));
        });
    }

    const screenshotTranslateBtn = document.getElementById('screenshot-translate-btn');
    if (screenshotTranslateBtn) {
        screenshotTranslateBtn.addEventListener('click', () => {
            app.setCaptureMode('screenshot_translate');
            sendToBackground({ action: "INITIATE_CAPTURE", mode: 'screenshot_translate', source: 'sidepanel' });
            ui.updateStatus(t('selectTranslate'));
        });
    }

    const snipBtn = document.getElementById('snip-btn');
    if (snipBtn) {
        snipBtn.addEventListener('click', () => {
            app.setCaptureMode('snip');
            sendToBackground({ action: "INITIATE_CAPTURE", mode: 'snip', source: 'sidepanel' });
            ui.updateStatus(t('selectSnip'));
        });
    }

    // Page Context Toggle
    const contextBtn = document.getElementById('page-context-btn');
    if (contextBtn) {
        contextBtn.addEventListener('click', () => {
            app.togglePageContext();
            if (ui.inputFn) ui.inputFn.focus();
        });
    }

    // MCP Servers Panel is initialized separately in app.js

    // Model Selector (Hidden select for compatibility)
    const modelSelect = document.getElementById('model-select');

    // Custom Dropdown Elements
    const modelDropdown = document.getElementById('model-dropdown');
    const modelDropdownTrigger = document.getElementById('model-dropdown-trigger');
    const modelDropdownMenu = document.getElementById('model-dropdown-menu');

    // Auto-resize Logic (kept for compatibility, but not actively used now)
    const resizeModelSelect = () => {
        if (!modelSelect) return;

        // Safety: Ensure selectedIndex is valid
        if (modelSelect.selectedIndex === -1) {
            if (modelSelect.options.length > 0) modelSelect.selectedIndex = 0;
        }
        if (modelSelect.selectedIndex === -1) return;

        // Sync dropdown label with select value
        if (ui._syncDropdownSelection) {
            ui._syncDropdownSelection();
        }
    };

    if (setResizeRef) setResizeRef(resizeModelSelect); // Expose for message handler

    // --- Custom Dropdown Events ---
    if (modelDropdownTrigger && modelDropdown) {
        // Toggle dropdown on trigger click
        modelDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (ui.toggleDropdown) {
                ui.toggleDropdown();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (modelDropdown && !modelDropdown.contains(e.target)) {
                if (ui.toggleDropdown) {
                    ui.toggleDropdown(true); // force close
                }
            }
        });

        // Handle option selection in dropdown menu
        if (modelDropdownMenu) {
            modelDropdownMenu.addEventListener('click', (e) => {
                const option = e.target.closest('.model-dropdown-option');
                if (!option) return;

                const value = option.dataset.value;
                const provider = option.dataset.provider;
                const isConfig = option.dataset.isConfig === 'true';
                const configId = option.dataset.configId;
                const modelId = option.dataset.modelId;

                // Close dropdown
                if (ui.toggleDropdown) {
                    ui.toggleDropdown(true);
                }

                // Update selection
                if (ui.selectModelFromDropdown) {
                    ui.selectModelFromDropdown(value, provider, isConfig, configId, modelId);
                }

                // Handle provider switching
                const currentProvider = ui.getCurrentProvider ? ui.getCurrentProvider() : 'web';
                if (provider && provider !== currentProvider) {
                    if (ui.handleProviderSwitch) {
                        const switched = ui.handleProviderSwitch(provider, {
                            configId: isConfig ? configId : null,
                            modelId: isConfig ? modelId : null
                        });
                        if (switched) {
                            const providerNames = {
                                'web': 'Web (Free)',
                                'official': 'Official API',
                                'openai': 'Custom API'
                            };
                            ui.updateStatus(`✓ ${providerNames[provider] || provider}`);
                            setTimeout(() => ui.updateStatus(''), 2000);
                        }
                    }
                } else if (isConfig && configId) {
                    if (ui.handleOpenaiConfigSwitch) {
                        ui.handleOpenaiConfigSwitch(configId, modelId);
                    }
                }

                if (provider === 'official' && ui.handleOfficialModelSwitch) {
                    ui.handleOfficialModelSwitch(value);
                }

                // Notify app of model change
                app.handleModelChange(value);
            });
        }

        // Keyboard navigation for dropdown
        modelDropdownTrigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (ui.toggleDropdown) {
                    ui.toggleDropdown();
                }
            } else if (e.key === 'Escape') {
                if (ui.isDropdownOpen && ui.isDropdownOpen()) {
                    e.preventDefault();
                    ui.toggleDropdown(true);
                }
            }
        });
    }

    // Legacy select change handler (kept for programmatic changes)
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (!selectedOption) return;

            const selectedProvider = selectedOption.dataset.provider;
            const currentProvider = ui.getCurrentProvider ? ui.getCurrentProvider() : 'web';
            const isOpenAIConfig = selectedOption.dataset.isConfig === 'true';
            const configId = selectedOption.dataset.configId;
            const modelId = selectedOption.dataset.modelId;

            // Check if this is a provider switch (cross-provider model selection)
            if (selectedProvider && selectedProvider !== currentProvider) {
                // Provider switch detected
                if (ui.handleProviderSwitch) {
                    const switched = ui.handleProviderSwitch(selectedProvider, {
                        configId: isOpenAIConfig ? configId : null,
                        modelId: isOpenAIConfig ? modelId : null
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
                    ui.handleOpenaiConfigSwitch(configId, modelId);
                }
            }

            if (selectedProvider === 'official' && ui.handleOfficialModelSwitch) {
                ui.handleOfficialModelSwitch(e.target.value);
            }

            // Always notify app of model change for session tracking
            app.handleModelChange(e.target.value);

            // Sync dropdown UI
            if (ui._syncDropdownSelection) {
                ui._syncDropdownSelection();
            }
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

    // Save Chat Button
    const saveChatBtn = document.getElementById('save-chat-btn');
    if (saveChatBtn) {
        // Track save state per session
        let savedFilenames = {}; // { sessionId: filename }

        const updateSaveButtonState = () => {
            const session = app.sessionManager?.getCurrentSession();
            if (!session) {
                saveChatBtn.classList.remove('has-content', 'saved');
                saveChatBtn.classList.add('disabled');
                return;
            }

            const hasContent = session.messages && session.messages.length > 0;
            const hasSavedFilename = !!savedFilenames[session.id];

            saveChatBtn.classList.remove('disabled');
            saveChatBtn.classList.toggle('has-content', hasContent && !hasSavedFilename);
            saveChatBtn.classList.toggle('saved', hasSavedFilename);
        };

        // Update button state when session changes
        const originalSetCurrentId = app.sessionManager?.setCurrentId?.bind(app.sessionManager);
        if (app.sessionManager && originalSetCurrentId) {
            app.sessionManager.setCurrentId = (id) => {
                originalSetCurrentId(id);
                updateSaveButtonState();
            };
        }

        // Update button state when messages are added
        const originalAddMessage = app.sessionManager?.addMessage?.bind(app.sessionManager);
        if (app.sessionManager && originalAddMessage) {
            app.sessionManager.addMessage = (...args) => {
                const result = originalAddMessage(...args);
                // Mark as unsaved when content changes
                const session = app.sessionManager.getCurrentSession();
                if (session && savedFilenames[session.id]) {
                    // Content changed after save - show "has-content" indicator
                    saveChatBtn.classList.add('has-content');
                    saveChatBtn.classList.remove('saved');
                }
                return result;
            };
        }

        saveChatBtn.addEventListener('click', () => {
            const session = app.sessionManager?.getCurrentSession();
            if (!session || !session.messages || session.messages.length === 0) {
                ui.updateStatus(t('nothingToSave') || 'Nothing to save');
                setTimeout(() => ui.updateStatus(''), 2000);
                return;
            }

            // Convert to Markdown
            const markdown = sessionToMarkdown(session);
            if (!markdown) {
                ui.updateStatus(t('nothingToSave') || 'Nothing to save');
                setTimeout(() => ui.updateStatus(''), 2000);
                return;
            }

            // Determine filename (reuse existing or generate new)
            let filename = savedFilenames[session.id];
            const isUpdate = !!filename;
            if (!filename) {
                filename = generateFilename(session.timestamp);
                savedFilenames[session.id] = filename;
            }

            // Show saving state
            saveChatBtn.classList.add('saving');
            ui.updateStatus(t('saving') || 'Saving...');

            // Request save via message bridge
            requestSaveChat({
                content: markdown,
                filename: filename,
                isUpdate: isUpdate,
                sessionId: session.id
            });
        });

        // Listen for save result
        window.addEventListener('message', (event) => {
            if (event.data?.action === 'SAVE_CHAT_RESULT') {
                saveChatBtn.classList.remove('saving');

                if (event.data.success) {
                    saveChatBtn.classList.remove('has-content');
                    saveChatBtn.classList.add('saved');
                    const msg = event.data.isUpdate
                        ? (t('chatUpdated') || 'Chat updated')
                        : (t('chatSaved') || 'Chat saved');
                    ui.updateStatus(`✓ ${msg}: ${event.data.filename}`);
                } else {
                    ui.updateStatus(`✗ ${event.data.error || 'Save failed'}`);
                }

                setTimeout(() => ui.updateStatus(''), 3000);
            }
        });

        // Initial state update
        setTimeout(updateSaveButtonState, 100);
    }
}
