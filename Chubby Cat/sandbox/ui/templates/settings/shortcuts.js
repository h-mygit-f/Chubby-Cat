
export const ShortcutsSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="keyboardShortcuts">Keyboard Shortcuts</h4>
    <p class="setting-desc" style="margin-bottom: 12px;" data-i18n="shortcutDesc">Click input and press keys to change.</p>

    <div class="shortcut-row">
        <label data-i18n="quickAsk">Quick Ask (Floating)</label>
        <input type="text" id="shortcut-quick-ask" class="shortcut-input" readonly value="Ctrl+G">
    </div>

    <div class="shortcut-row">
        <label data-i18n="openSidePanel">Open Side Panel</label>
        <input type="text" id="shortcut-open-panel" class="shortcut-input" readonly value="Alt+S">
    </div>

    <div class="shortcut-row">
        <label data-i18n="shortcutBrowserControl">Open Browser Control</label>
        <input type="text" id="shortcut-browser-control" class="shortcut-input" readonly value="Ctrl+B">
    </div>

    <div class="shortcut-row">
        <label data-i18n="shortcutFocusInput">Focus Input</label>
        <input type="text" class="shortcut-input" readonly value="Ctrl+P">
    </div>

    <div class="shortcut-row">
        <label data-i18n="shortcutSwitchModel">Switch Model</label>
        <input type="text" class="shortcut-input" readonly value="Tab">
    </div>
</div>`;