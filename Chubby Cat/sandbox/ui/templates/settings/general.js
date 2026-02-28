
export const GeneralSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="general">常规</h4>

    <div class="shortcut-row" style="margin-bottom: 12px;">
        <div style="flex: 1;">
            <label data-i18n="textSelection" style="font-weight: 500; display: block; margin-bottom: 2px;">选择文字工具栏</label>
            <span class="setting-desc" data-i18n="textSelectionDesc">选择文字时显示浮动工具栏。</span>
        </div>
        <input type="checkbox" id="text-selection-toggle" style="width: 20px; height: 20px; cursor: pointer;">
    </div>

    <div class="shortcut-row" style="margin-bottom: 12px;">
        <div style="flex: 1;">
            <label data-i18n="imageToolsToggle" style="font-weight: 500; display: block; margin-bottom: 2px;">显示图片工具按鈕</label>
            <span class="setting-desc" data-i18n="imageToolsToggleDesc">悬停图片时显示 AI 按鈕。</span>
        </div>
        <input type="checkbox" id="image-tools-toggle" style="width: 20px; height: 20px; cursor: pointer;">
    </div>

    <div class="shortcut-row" style="margin-bottom: 12px; align-items: flex-start;">
        <div style="flex: 1; margin-right: 12px;">
            <label data-i18n="accountIndices" style="font-weight: 500; display: block; margin-bottom: 2px;">账户索引</label>
            <span class="setting-desc" data-i18n="accountIndicesDesc">用于轮讯的逗号分隔用户索引（如 0, 1, 2）。</span>
        </div>
        <input type="text" id="account-indices-input" class="shortcut-input" style="width: 100px; text-align: left;" placeholder="0">
    </div>

    <div style="margin-top: 16px;">
        <h5 data-i18n="sidebarBehavior" style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">徧边栏重新打开时</h5>

        <div style="display: flex; flex-direction: column; gap: 12px;">
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="radio" name="sidebar-behavior" value="auto" style="margin-top: 3px;">
                <div>
                    <div data-i18n="sidebarBehaviorAuto" style="font-weight: 500; font-size: 14px; color: var(--text-primary);">自动恢复或重新开始</div>
                    <div data-i18n="sidebarBehaviorAutoDesc" style="font-size: 12px; color: var(--text-tertiary);">如果在 10 分钟内打开则恢复，否则开始新对话。</div>
                </div>
            </label>

            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="sidebar-behavior" value="restore">
                <span data-i18n="sidebarBehaviorRestore" style="font-size: 14px; color: var(--text-primary);">始终恢复上次对话</span>
            </label>

            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="sidebar-behavior" value="new">
                <span data-i18n="sidebarBehaviorNew" style="font-size: 14px; color: var(--text-primary);">始终开始新对话</span>
            </label>
        </div>
    </div>
</div>`;
