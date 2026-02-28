
export const AppearanceSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="appearance">外观</h4>
    <div class="shortcut-row">
        <label data-i18n="theme">主题</label>
        <select id="theme-select" class="shortcut-input" style="width: auto; padding: 6px 12px; text-align: left;">
            <option value="system" data-i18n="system">系统默认</option>
            <option value="light" data-i18n="light">亮色</option>
            <option value="dark" data-i18n="dark">暗色</option>
        </select>
    </div>
    <div class="shortcut-row">
        <label data-i18n="language">语言</label>
        <select id="language-select" class="shortcut-input" style="width: auto; padding: 6px 12px; text-align: left;">
            <option value="system" data-i18n="system">系统默认</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
        </select>
    </div>
</div>`;
