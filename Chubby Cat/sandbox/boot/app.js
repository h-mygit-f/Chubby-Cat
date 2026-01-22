
// sandbox/boot/app.js
import { renderLayout } from '../ui/layout.js';
import { applyTranslations } from '../core/i18n.js';
import { configureMarkdown } from '../render/config.js';
import { sendToBackground } from '../../lib/messaging.js';
import { loadLibs } from './loader.js';
import { AppMessageBridge } from './messaging.js';
import { bindAppEvents } from './events.js';

export function initAppMode() {
    // 0. Render App Layout (Before DOM query)
    renderLayout();

    // 1. Apply Initial Translations
    applyTranslations();

    // 2. Signal Ready Immediately
    window.parent.postMessage({ action: 'UI_READY' }, '*');

    // 3. Initialize Message Bridge
    const bridge = new AppMessageBridge();

    // 4. Listen for Language Changes (DOM level)
    document.addEventListener('gemini-language-changed', () => {
        applyTranslations();
    });

    // 5. Async Bootstapping
    (async () => {
        // Dynamic Import of Application Logic
        const [
            { ImageManager },
            { SessionManager },
            { UIController },
            { AppController },
            { QuickPhrasesController },
            { SkillsDropdownController }
        ] = await Promise.all([
            import('../core/image_manager.js'),
            import('../core/session_manager.js'),
            import('../ui/ui_controller.js'),
            import('../controllers/app_controller.js'),
            import('../ui/quick_phrases.js'),
            import('../ui/skills_dropdown.js')
        ]);

        // Init Managers
        const sessionManager = new SessionManager();

        const ui = new UIController({
            historyListEl: document.getElementById('history-list'),
            sidebar: document.getElementById('history-sidebar'),
            sidebarOverlay: document.getElementById('sidebar-overlay'),
            statusDiv: document.getElementById('status'),
            historyDiv: document.getElementById('chat-history'),
            inputFn: document.getElementById('prompt'),
            sendBtn: document.getElementById('send'),
            historyToggleBtn: document.getElementById('history-toggle'),
            closeSidebarBtn: document.getElementById('close-sidebar'),
            modelSelect: document.getElementById('model-select')
        });

        const imageManager = new ImageManager({
            imageInput: document.getElementById('image-input'),
            imagePreview: document.getElementById('image-preview'),
            inputWrapper: document.querySelector('.input-wrapper'),
            inputFn: document.getElementById('prompt')
        }, {
            onUrlDrop: (url) => {
                ui.updateStatus("Loading image...");
                sendToBackground({ action: "FETCH_IMAGE", url: url });
            },
            onError: (message) => {
                ui.updateStatus(message);
                setTimeout(() => ui.updateStatus(""), 3000);
            }
        });

        // Initialize Controller
        const app = new AppController(sessionManager, ui, imageManager);

        // Connect Bridge to App Instances
        bridge.setUI(ui);
        bridge.setApp(app);

        // Bind DOM Events
        bindAppEvents(app, ui, (fn) => bridge.setResizeFn(fn));

        // Ensure input is focused at the top-left on launch
        if (ui.chat && ui.chat.scheduleInitialFocus) {
            ui.chat.scheduleInitialFocus();
        }

        // Initialize Quick Phrases Controller
        new QuickPhrasesController({
            inputFn: document.getElementById('prompt')
        });

        // Initialize Skills Dropdown Controller
        new SkillsDropdownController({
            inputFn: document.getElementById('prompt')
        });

        // Initialize MCP Servers Controller
        import('../ui/mcp_servers.js').then(({ McpServersController }) => {
            const mcpServers = new McpServersController({
                settingsController: ui.settings
            });
            // Store reference for later sync
            app.mcpServersController = mcpServers;
            // Sync button state immediately after init (fixes race condition with RESTORE_CONNECTION_SETTINGS)
            mcpServers.syncFromSettings();
        });

        // Trigger dependency load in parallel, and re-render if needed when done
        loadLibs().then(() => {
            if (app) app.rerender();
        });

        // Configure Markdown (Initial pass, might be skipped if marked not loaded yet)
        configureMarkdown();

    })();
}
