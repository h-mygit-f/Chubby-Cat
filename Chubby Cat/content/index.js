
// content.js v1.1.0 -> content/index.js

console.log("%c Chubby Cat v1.1.0 Ready ", "background: #333; color: #00ff00; font-size: 16px");

(function () {
    // Dependencies (Loaded via manifest order)
    const shortcuts = window.GeminiShortcuts;
    const router = window.GeminiMessageRouter;
    const Overlay = window.ChubbyCatOverlay;
    const Controller = window.GeminiToolbarController;

    // Initialize Helpers
    const selectionOverlay = new Overlay();
    const floatingToolbar = new Controller();

    // Initialize Router
    router.init(floatingToolbar, selectionOverlay);

    // Link Shortcuts
    shortcuts.setController(floatingToolbar);

    function getEffectiveToggles(storageData) {
        const provider = storageData.geminiProvider || 'web';

        if (provider === 'openai') {
            const configs = storageData.geminiOpenaiConfigs;
            const activeId = storageData.geminiOpenaiActiveConfigId;

            if (Array.isArray(configs) && configs.length > 0) {
                const activeConfig = activeId
                    ? configs.find(c => c.id === activeId) || configs[0]
                    : configs[0];

                return {
                    textSelection: activeConfig.textSelectionEnabled !== false,
                    imageTools: activeConfig.imageToolsEnabled !== false
                };
            }
        }

        return {
            textSelection: storageData.geminiTextSelectionEnabled !== false,
            imageTools: storageData.geminiImageToolsEnabled !== false
        };
    }

    // Handle initial settings that don't fit in dedicated modules yet
    chrome.storage.local.get([
        'geminiTextSelectionEnabled',
        'geminiImageToolsEnabled',
        'geminiProvider',
        'geminiOpenaiConfigs',
        'geminiOpenaiActiveConfigId'
    ], (result) => {
        const toggles = getEffectiveToggles(result);
        if (floatingToolbar) {
            floatingToolbar.setSelectionEnabled(toggles.textSelection);
            floatingToolbar.setImageToolsEnabled(toggles.imageTools);
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            const needsUpdate = changes.geminiTextSelectionEnabled ||
                changes.geminiImageToolsEnabled ||
                changes.geminiProvider ||
                changes.geminiOpenaiConfigs ||
                changes.geminiOpenaiActiveConfigId;

            if (needsUpdate) {
                chrome.storage.local.get([
                    'geminiTextSelectionEnabled',
                    'geminiImageToolsEnabled',
                    'geminiProvider',
                    'geminiOpenaiConfigs',
                    'geminiOpenaiActiveConfigId'
                ], (result) => {
                    const toggles = getEffectiveToggles(result);
                    if (floatingToolbar) {
                        floatingToolbar.setSelectionEnabled(toggles.textSelection);
                        floatingToolbar.setImageToolsEnabled(toggles.imageTools);
                    }
                });
            }
        }
    });

})();