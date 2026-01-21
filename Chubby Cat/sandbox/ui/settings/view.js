
// sandbox/ui/settings/view.js
import { ConnectionSection } from './sections/connection.js';
import { GeneralSection } from './sections/general.js';
import { AppearanceSection } from './sections/appearance.js';
import { ShortcutsSection } from './sections/shortcuts.js';
import { DataManagementSection } from './sections/data_management.js';
import { AboutSection } from './sections/about.js';
import { DocumentTranslationSection } from './sections/document_translation.js';
import { FloatingToolSection } from './sections/floating_tool.js';

export class SettingsView {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};

        // Dirty state tracking
        this._initialSnapshot = null;

        // Fullscreen state
        this._isFullscreen = false;

        // Active panel
        this._activePanel = 'model';

        // Initialize Sections
        this.connection = new ConnectionSection({
            onProviderChange: (provider) => this.handleProviderChange(provider),
            onOpenaiConfigChange: (toggles) => this.handleOpenaiConfigChange(toggles)
        });

        this.general = new GeneralSection({
            onTextSelectionChange: (val) => this.fire('onTextSelectionChange', val),
            onImageToolsChange: (val) => this.fire('onImageToolsChange', val),
            onSidebarBehaviorChange: (val) => this.fire('onSidebarBehaviorChange', val)
        });

        this.floatingTool = new FloatingToolSection({
            onFloatingToolSettingsChange: (settings) => this.fire('onFloatingToolSettingsChange', settings),
            onSummaryPromptChange: (val) => this.fire('onSummaryPromptChange', val)
        });

        this.documentTranslation = new DocumentTranslationSection({
            onDocProcessingToggle: (val) => this.fire('onDocProcessingToggle', val)
        });

        this.appearance = new AppearanceSection({
            onThemeChange: (val) => this.fire('onThemeChange', val),
            onLanguageChange: (val) => this.fire('onLanguageChange', val)
        });

        this.shortcuts = new ShortcutsSection();

        this.dataManagement = new DataManagementSection({
            onExport: (options) => this.fire('onExport', options),
            onImport: (payload) => this.fire('onImport', payload)
        });

        this.about = new AboutSection({
            onDownloadLogs: () => this.fire('onDownloadLogs')
        });

        this.queryElements();
        this.bindEvents();
    }

    queryElements() {
        const get = (id) => document.getElementById(id);

        this.elements = {
            modal: get('settings-modal'),
            btnClose: get('close-settings'),
            btnFullscreen: get('toggle-fullscreen'),
            fullscreenIcon: get('fullscreen-icon'),
            minimizeIcon: get('minimize-icon'),
            btnSave: get('save-shortcuts'),
            btnReset: get('reset-shortcuts'),
            // Confirm dialog
            confirmModal: get('unsaved-confirm-modal'),
            confirmSave: get('confirm-save'),
            confirmDiscard: get('confirm-discard'),
            // Navigation
            navItems: document.querySelectorAll('.settings-nav-item'),
            panels: document.querySelectorAll('.settings-panel')
        };
    }

    bindEvents() {
        const { modal, btnClose, btnFullscreen, btnSave, btnReset, confirmModal, confirmSave, confirmDiscard, navItems } = this.elements;

        // Modal actions
        if (btnClose) btnClose.addEventListener('click', () => this.tryClose());
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.tryClose();
            });
        }

        // Fullscreen toggle
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        }

        // Navigation panel switching
        if (navItems) {
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const panel = item.getAttribute('data-panel');
                    if (panel) this.switchPanel(panel);
                });
            });
        }

        // Action Buttons
        if (btnSave) btnSave.addEventListener('click', () => this.handleSave());
        if (btnReset) btnReset.addEventListener('click', () => this.handleReset());

        // Confirm dialog actions
        if (confirmSave) confirmSave.addEventListener('click', () => {
            this._hideConfirmDialog();
            this.handleSave();
        });
        if (confirmDiscard) confirmDiscard.addEventListener('click', () => {
            this._hideConfirmDialog();
            this.close();
        });
        if (confirmModal) {
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) this._hideConfirmDialog();
            });
        }

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (confirmModal && confirmModal.classList.contains('visible')) {
                    this._hideConfirmDialog();
                } else if (modal && modal.classList.contains('visible')) {
                    this.tryClose();
                }
            }
        });
    }

    // --- Panel Navigation ---

    switchPanel(panelName) {
        const { navItems, panels } = this.elements;

        // Update nav items
        navItems.forEach(item => {
            if (item.getAttribute('data-panel') === panelName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update panels
        panels.forEach(panel => {
            if (panel.getAttribute('data-panel') === panelName) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        this._activePanel = panelName;
    }

    // --- Fullscreen Toggle ---

    toggleFullscreen() {
        const { modal, fullscreenIcon, minimizeIcon } = this.elements;

        this._isFullscreen = !this._isFullscreen;

        if (modal) {
            if (this._isFullscreen) {
                modal.classList.add('fullscreen');
            } else {
                modal.classList.remove('fullscreen');
            }
        }

        // Toggle icons
        if (fullscreenIcon && minimizeIcon) {
            if (this._isFullscreen) {
                fullscreenIcon.style.display = 'none';
                minimizeIcon.style.display = 'block';
            } else {
                fullscreenIcon.style.display = 'block';
                minimizeIcon.style.display = 'none';
            }
        }
    }

    handleSave() {
        const shortcutsData = this.shortcuts.getData();
        const connectionData = this.connection.getData();
        const generalData = this.general.getData();
        const documentTranslationData = this.documentTranslation.getData();
        const floatingToolData = this.floatingTool.getData();

        const data = {
            shortcuts: shortcutsData,
            connection: { ...connectionData, ...documentTranslationData },
            textSelection: generalData.textSelection,
            imageTools: generalData.imageTools,
            accountIndices: generalData.accountIndices,
            floatingTool: {
                enabled: floatingToolData.enabled,
                action: floatingToolData.action
            }
        };

        this.fire('onSave', data);
        this.close();
    }

    handleReset() {
        this.fire('onReset');
    }

    // --- Public API ---

    open() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('visible');
            this.fire('onOpen');
            // Capture initial state for dirty checking (defer to allow sections to populate)
            setTimeout(() => {
                this._initialSnapshot = this._getCurrentData();
            }, 0);
        }
    }

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('visible');
            // Reset fullscreen on close
            if (this._isFullscreen) {
                this.toggleFullscreen();
            }
        }
        this._initialSnapshot = null;
    }

    tryClose() {
        if (this.isDirty()) {
            this._showConfirmDialog();
        } else {
            this.close();
        }
    }

    _showConfirmDialog() {
        if (this.elements.confirmModal) {
            this.elements.confirmModal.classList.add('visible');
        }
    }

    _hideConfirmDialog() {
        if (this.elements.confirmModal) {
            this.elements.confirmModal.classList.remove('visible');
        }
    }

    isDirty() {
        if (!this._initialSnapshot) return false;
        const current = this._getCurrentData();
        return !this._deepEqual(this._initialSnapshot, current);
    }

    _getCurrentData() {
        return {
            shortcuts: this.shortcuts.getData(),
            connection: this.connection.getData(),
            general: this.general.getData(),
            floatingTool: this.floatingTool.getData(),
            documentTranslation: this.documentTranslation.getData()
        };
    }

    _deepEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return a === b;
        if (typeof a !== typeof b) return false;
        if (typeof a !== 'object') return a === b;
        if (Array.isArray(a) !== Array.isArray(b)) return false;

        if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this._deepEqual(a[i], b[i])) return false;
            }
            return true;
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
            if (!this._deepEqual(a[key], b[key])) return false;
        }
        return true;
    }

    // Delegation to Shortcuts
    setShortcuts(shortcuts) {
        this.shortcuts.setData(shortcuts);
    }

    // Delegation to Appearance
    setThemeValue(theme) {
        this.appearance.setTheme(theme);
    }

    setLanguageValue(lang) {
        this.appearance.setLanguage(lang);
    }

    applyVisualTheme(theme) {
        this.appearance.applyVisualTheme(theme);
    }

    // Delegation to General
    setToggles(textSelection, imageTools) {
        this.general.setToggles(textSelection, imageTools);
    }

    setSidebarBehavior(behavior) {
        this.general.setSidebarBehavior(behavior);
    }

    setAccountIndices(val) {
        this.general.setAccountIndices(val);
    }

    setSummaryPrompt(val) {
        this.floatingTool.setSummaryPrompt(val);
    }

    setFloatingToolSettings(settings) {
        if (this.floatingTool) {
            this.floatingTool.setSettings(settings);
        }
    }

    // Delegation to Connection
    setConnectionSettings(data) {
        this.connection.setData(data);
        this.documentTranslation.setData(data);
    }

    // Delegation to About
    displayStars(count) {
        this.about.displayStars(count);
    }

    hasFetchedStars() {
        return this.about.hasFetchedStars();
    }

    getCurrentVersion() {
        return this.about.getCurrentVersion();
    }

    displayUpdateStatus(latest, current, isUpdateAvailable) {
        this.about.displayUpdateStatus(latest, current, isUpdateAvailable);
    }

    // Delegation to DataManagement
    setExportResult(success, message) {
        this.dataManagement.setExportResult(success, message);
    }

    setImportResult(success, message) {
        this.dataManagement.setImportResult(success, message);
    }

    handleProviderChange(provider) {
        if (provider === 'openai') {
            const toggles = this.connection.getActiveOpenaiToggles();
            if (toggles) {
                this.general.setToggles(toggles.textSelectionEnabled, toggles.imageToolsEnabled);
            }
        }
        if (this.documentTranslation) {
            this.documentTranslation.setProvider(provider);
        }
        this.fire('onProviderChange', provider);
    }

    handleOpenaiConfigChange(toggles) {
        if (toggles && this.connection.getCurrentProvider() === 'openai') {
            this.general.setToggles(toggles.textSelectionEnabled, toggles.imageToolsEnabled);
        }
    }

    syncTogglesToOpenaiConfig(textSelection, imageTools) {
        if (this.connection.getCurrentProvider() === 'openai') {
            this.connection.updateActiveOpenaiToggles(textSelection, imageTools);
        }
    }

    fire(event, data) {
        if (this.callbacks[event]) this.callbacks[event](data);
    }
}
