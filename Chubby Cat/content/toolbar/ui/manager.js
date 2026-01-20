
(function() {
    // Dependencies
    const DOMBuilder = window.GeminiToolbarDOM;
    const View = window.GeminiToolbarView;
    const DragController = window.GeminiDragController;
    const Events = window.GeminiToolbarEvents;
    const GrammarManager = window.GeminiUIGrammar;
    const Renderer = window.GeminiUIRenderer;
    const ActionsDelegate = window.GeminiToolbarUIActions;
    const CodeCopyHandler = window.GeminiCodeCopyHandler;
    
    // Localization helper
    const isZh = navigator.language.startsWith('zh');
    const DEFAULT_TITLE = isZh ? "询问" : "Ask";

    /**
     * Main UI Manager
     * Handles lifecycle, view orchestration, and public interface for the Controller.
     */
    class ToolbarUI {
        constructor() {
            this.host = null;
            this.shadow = null;
            this.view = null;
            this.dragController = null;
            this.events = null;
            this.domBuilder = new DOMBuilder();
            this.callbacks = {};
            this.isBuilt = false;
            
            // Sub-Managers
            this.grammarManager = null;
            this.bridge = null; // Renderer Bridge
            this.renderer = null;
            this.actionsDelegate = null;
            this.codeCopyHandler = null;
        }

        setCallbacks(callbacks) {
            this.callbacks = callbacks;
        }

        build() {
            if (this.isBuilt) return;
            
            // Delegate DOM creation
            const { host, shadow } = this.domBuilder.create();
            this.host = host;
            this.shadow = shadow;
            
            // Initialize Sub-components
            this.view = new View(this.shadow);
            this.grammarManager = new GrammarManager(this.view);
            
            // Initialize Renderer Bridge (for background markdown rendering & image processing)
            this.bridge = new window.GeminiRendererBridge(this.host);

            // Initialize Renderer Logic
            this.renderer = new Renderer(this.view, this.bridge);
            
            // Init Actions Delegate
            this.actionsDelegate = new ActionsDelegate(this);

            // Init Code Copy Handler
            this.codeCopyHandler = new CodeCopyHandler();

            // Init Drag Controller with Docking Logic
            this.dragController = new DragController(
                this.view.elements.askWindow, 
                this.view.elements.askHeader,
                {
                    onSnap: (side, top) => this.view.dockWindow(side, top),
                    onUndock: () => this.view.undockWindow()
                }
            );

            // Init Drag Controller for Floating Toolbar
            this.toolbarDragController = new DragController(
                this.view.elements.toolbar,
                this.view.elements.toolbarDrag,
                {
                    // No docking for small toolbar
                }
            );

            this.events = new Events(this);
            
            // Bind Events
            this.events.bind(this.view.elements, this.view.elements.askWindow);
            
            this.isBuilt = true;
        }

        // --- Delegate Accessors ---
        
        get actions() {
            return this.actionsDelegate;
        }
        
        get codeCopy() {
            return this.codeCopyHandler;
        }

        // --- Other Handlers ---

        handleImageClick() {
            this.fireCallback('onAction', 'image_analyze');
        }

        handleImageHover(isHovering) {
            this.fireCallback('onImageBtnHover', isHovering);
        }

        handleModelChange(model) {
            this.fireCallback('onModelChange', model);
        }

        saveWindowDimensions(w, h) {
            chrome.storage.local.set({ 'chubby_cat_window_size': { w, h } });
        }

        fireCallback(type, ...args) {
            if (type === 'onImageBtnHover' && this.callbacks.onImageBtnHover) {
                this.callbacks.onImageBtnHover(...args);
            } else if (type === 'onModelChange' && this.callbacks.onModelChange) {
                this.callbacks.onModelChange(...args);
            } else if (this.callbacks.onAction) {
                this.callbacks.onAction(...args);
            }
        }

        // --- Public API ---

        show(rect, mousePoint) {
            this.view.showToolbar(rect, mousePoint);
        }

        hide() {
            this.view.hideToolbar();
        }

        hideAll() {
            this.hide();
            this.hideAskWindow();
            this.hideImageButton();
        }

        showImageButton(rect) {
            this.view.showImageButton(rect);
        }

        hideImageButton() {
            this.view.hideImageButton();
        }

        showAskWindow(rect, contextText, title = DEFAULT_TITLE, mousePoint = null) {
            return this.view.showAskWindow(rect, contextText, title, () => this.dragController.reset(), mousePoint);
        }

        showLoading(msg) {
            this.view.showLoading(msg);
        }

        stopLoading() {
            this.view.updateStreamingState(false);
            if (this.grammarManager) {
                this.grammarManager.updateResultActions(false);
            }
        }

        async showResult(text, title, isStreaming, images = []) {
            if (this.renderer) {
                await this.renderer.show(text, title, isStreaming, images);
            }
            
            // Update Grammar UI state
            if (this.grammarManager) {
                this.grammarManager.updateResultActions(isStreaming);
            }
        }

        handleGeneratedImageResult(request) {
            if (this.renderer) {
                this.renderer.handleGeneratedImageResult(request);
            }
        }
        
        async processImage(base64) {
            if (this.bridge) {
                return this.bridge.processImage(base64);
            }
            return base64; // Fallback
        }

        showError(text) {
             this.view.showError(text);
        }

        hideAskWindow() {
            this.view.hideAskWindow();
            this.resetGrammarMode();
        }

        setInputValue(text) {
            this.view.setInputValue(text);
        }

        // --- Model Selection ---

        getSelectedModel() {
            return this.view ? this.view.getSelectedModel() : "gemini-2.5-flash";
        }

        setSelectedModel(model) {
            if (this.view) {
                this.view.setSelectedModel(model);
            }
        }

        updateModelList(settings, currentModel) {
            const provider = settings.provider || (settings.useOfficialApi ? 'official' : 'web');
            let opts = [];
            
            if (provider === 'official') {
                const officialModels = [];
                const pushModel = (val) => {
                    const trimmed = (val || '').trim();
                    if (!trimmed || officialModels.includes(trimmed)) return;
                    officialModels.push(trimmed);
                };

                if (Array.isArray(settings.officialModels)) {
                    settings.officialModels.forEach(m => {
                        if (typeof m === 'string') return pushModel(m);
                        if (m && typeof m === 'object') return pushModel(m.id || m.name || m.value || '');
                    });
                }
                if (typeof settings.officialModel === 'string') {
                    settings.officialModel.split(',').map(m => m.trim()).forEach(pushModel);
                }

                const activeOfficial = (settings.officialActiveModelId || '').trim();
                if (activeOfficial && !officialModels.includes(activeOfficial)) {
                    officialModels.unshift(activeOfficial);
                }

                if (officialModels.length > 0) {
                    opts = officialModels.map(m => ({ val: m, txt: m }));
                } else {
                    opts = [
                        { val: 'gemini-3-flash-preview', txt: 'Gemini 3 Flash' },
                        { val: 'gemini-3-pro-preview', txt: 'Gemini 3 Pro' }
                    ];
                }
            } else if (provider === 'grok') {
                opts = [
                    { val: 'grok-4', txt: 'Grok 4' },
                    { val: 'grok-4.1-thinking', txt: 'Grok 4.1 Thinking' },
                    { val: 'grok-4-fast', txt: 'Grok 4 Fast' }
                ];
            } else if (provider === 'openai') {
                const configs = Array.isArray(settings.openaiConfigs) ? settings.openaiConfigs : [];
                const normalizeModels = (cfg) => {
                    const list = [];
                    const pushModel = (val) => {
                        const trimmed = (val || '').trim();
                        if (!trimmed || list.includes(trimmed)) return;
                        list.push(trimmed);
                    };
                    if (cfg && Array.isArray(cfg.models)) {
                        cfg.models.forEach(m => {
                            if (typeof m === 'string') return pushModel(m);
                            if (m && typeof m === 'object') return pushModel(m.id || m.name || m.value || '');
                        });
                    }
                    if (cfg && typeof cfg.model === 'string') {
                        cfg.model.split(',').map(m => m.trim()).forEach(pushModel);
                    }
                    if (cfg && cfg.activeModelId) pushModel(cfg.activeModelId);
                    return list;
                };
                const buildValue = (configId, modelId) => {
                    if (!configId) return modelId || '';
                    if (!modelId) return configId;
                    return `${configId}::${modelId}`;
                };

                if (configs.length > 0) {
                    configs.forEach(cfg => {
                        if (!cfg || (!cfg.baseUrl && !cfg.apiKey)) return;
                        const label = (cfg.name || cfg.baseUrl || 'Unnamed Config').trim();
                        const models = normalizeModels(cfg);
                        if (models.length > 0) {
                            models.forEach(modelId => {
                                opts.push({
                                    val: buildValue(cfg.id, modelId),
                                    txt: `${label} - ${modelId}`
                                });
                            });
                        } else {
                            opts.push({ val: cfg.id, txt: label });
                        }
                    });
                }

                if (opts.length === 0) {
                    const rawModels = settings.openaiModel || "";
                    const models = rawModels.split(',').map(m => m.trim()).filter(m => m);
                    if (models.length === 0) {
                        opts = [{ val: 'openai_custom', txt: 'Custom Model' }];
                    } else {
                        opts = models.map(m => ({ val: m, txt: m }));
                    }
                }
            } else {
                opts = [
                    { val: 'gemini-3-flash', txt: 'Fast' },
                    { val: 'gemini-3-flash-thinking', txt: 'Thinking' },
                    { val: 'gemini-3-pro', txt: '3 Pro' }
                ];
            }

            let selectedValue = currentModel;
            if (selectedValue && selectedValue.startsWith('cfg_') && !opts.some(o => o.val === selectedValue)) {
                const match = opts.find(o => o.val.startsWith(`${selectedValue}::`));
                if (match) selectedValue = match.val;
            }

            if (provider === 'official' && selectedValue && !opts.some(o => o.val === selectedValue)) {
                const fallback = (settings.officialActiveModelId || '').trim();
                if (fallback && opts.some(o => o.val === fallback)) {
                    selectedValue = fallback;
                }
            }

            this.view.updateModelOptions(opts, selectedValue);
        }

        // --- Grammar Mode Delegation ---

        setGrammarMode(enabled, sourceElement = null, selectionRange = null) {
            if (this.grammarManager) {
                this.grammarManager.setMode(enabled, sourceElement, selectionRange);
            }
        }

        resetGrammarMode() {
            if (this.grammarManager) {
                this.grammarManager.reset();
            }
        }

        showInsertReplaceButtons(show) {
            if (this.grammarManager) {
                this.grammarManager.toggleButtons(show);
            }
        }

        getSourceInfo() {
            return this.grammarManager ? this.grammarManager.getSourceInfo() : { element: null, range: null };
        }

        showGrammarButton(show) {
            if (this.grammarManager) {
                this.grammarManager.showTriggerButton(show);
            }
        }

        // --- Utils ---

        showCopySelectionFeedback(success) {
             this.view.toggleCopySelectionIcon(success);
             setTimeout(() => {
                 this.view.toggleCopySelectionIcon(null); 
             }, 2000);
        }

        isVisible() {
            if (!this.view) return false;
            return this.view.isToolbarVisible() || this.view.isWindowVisible();
        }

        isWindowVisible() {
            if (!this.view) return false;
            return this.view.isWindowVisible();
        }

        isHost(target) {
            if (!this.view) return false;
            return this.view.isHost(target, this.host);
        }
    }

    window.GeminiToolbarUI = ToolbarUI;

})();
