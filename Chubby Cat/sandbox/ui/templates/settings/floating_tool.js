export const FloatingToolSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="floatingTool">Floating Tool</h4>

    <div class="shortcut-row" style="margin-bottom: 12px; align-items: flex-start;">
        <div style="flex: 1;">
            <label data-i18n="floatingToolVisibility" style="font-weight: 500; display: block; margin-bottom: 2px;">Show Floating Tool</label>
            <span class="setting-desc" data-i18n="floatingToolVisibilityDesc">Show the sidebar floating icon on web pages.</span>
        </div>
        <input type="checkbox" id="floating-tool-toggle" style="width: 20px; height: 20px; cursor: pointer;">
    </div>

    <div style="margin-bottom: 12px;">
        <label data-i18n="floatingToolAction" style="font-weight: 500; display: block; margin-bottom: 2px;">Click Action</label>
        <span class="setting-desc" data-i18n="floatingToolActionDesc" style="display: block; margin-bottom: 8px;">Choose what happens when you click the floating icon.</span>
        <select id="floating-tool-action" class="shortcut-input" style="width: 100%; text-align: left; padding: 8px 12px;">
            <option value="summary" data-i18n="floatingToolActionSummary">Summarize Page</option>
            <option value="open_sidebar" data-i18n="floatingToolActionOpenSidebar">Open Side Panel</option>
        </select>
    </div>

    <div id="summary-prompt-container" style="margin-top: 12px;">
        <h5 data-i18n="summaryPromptTitle" style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">Page Summary Prompt</h5>
        <span class="setting-desc" data-i18n="summaryPromptDesc" style="display: block; margin-bottom: 8px;">Customize the prompt used when clicking the sidebar icon to summarize pages.</span>
        <textarea id="summary-prompt-input" class="shortcut-input" style="width: 100%; min-height: 60px; resize: vertical; padding: 8px; font-size: 13px; line-height: 1.4; border-radius: 6px;" placeholder="请总结这个网页的主要内容"></textarea>
    </div>
</div>`;
