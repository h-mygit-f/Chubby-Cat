
export const ShortcutsSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="keyboardShortcuts">键盘快捷键</h4>
    <p class="setting-desc" style="margin-bottom: 12px;" data-i18n="shortcutDesc">点击输入框并按下按键进行修改。</p>

    <div class="shortcut-row">
        <label data-i18n="quickAsk">快速提问（浮动）</label>
        <input type="text" id="shortcut-quick-ask" class="shortcut-input" readonly value="Ctrl+G">
    </div>

    <div class="shortcut-row">
        <label data-i18n="openSidePanel">打开侧面板</label>
        <input type="text" id="shortcut-open-panel" class="shortcut-input" readonly value="Alt+S">
    </div>

    <div class="shortcut-row">
        <label data-i18n="shortcutBrowserControl">打开浏览器控制</label>
        <input type="text" id="shortcut-browser-control" class="shortcut-input" readonly value="Ctrl+B">
    </div>

    <div class="shortcut-row">
        <label data-i18n="shortcutFocusInput">聚焦输入框</label>
        <input type="text" class="shortcut-input" readonly value="Ctrl+P">
    </div>

    <div class="shortcut-row">
        <label data-i18n="shortcutSwitchModel">切换模型</label>
        <input type="text" class="shortcut-input" readonly value="Tab">
    </div>
</div>`;