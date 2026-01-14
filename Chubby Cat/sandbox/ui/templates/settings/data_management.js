
// sandbox/ui/templates/settings/data_management.js

export const DataManagementSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="dataManagement">Data Management</h4>
    
    <!-- Export Section -->
    <div class="shortcut-row" style="margin-bottom: 16px; flex-direction: column; align-items: stretch;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="flex: 1;">
                <label data-i18n="exportConfigs" style="font-weight: 500; display: block; margin-bottom: 2px;">Export Configurations</label>
                <span class="setting-desc" data-i18n="exportConfigsDesc">Export all OpenAI API configurations to a JSON file for backup or migration.</span>
            </div>
            <button id="export-configs-btn" class="btn-secondary" style="padding: 8px 16px; font-size: 13px; white-space: nowrap; margin-left: 12px;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span data-i18n="exportButton">Export</span>
            </button>
        </div>
        <div id="export-status" class="data-operation-status" style="display: none; font-size: 12px; padding: 6px 10px; border-radius: 6px; margin-top: 4px;"></div>
    </div>

    <!-- Divider -->
    <div style="height: 1px; background: var(--border-color); margin: 16px 0; opacity: 0.5;"></div>

    <!-- Import Section -->
    <div class="shortcut-row" style="flex-direction: column; align-items: stretch;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="flex: 1;">
                <label data-i18n="importConfigs" style="font-weight: 500; display: block; margin-bottom: 2px;">Import Configurations</label>
                <span class="setting-desc" data-i18n="importConfigsDesc">Import OpenAI API configurations from a previously exported JSON file.</span>
            </div>
        </div>
        
        <!-- Drop Zone -->
        <div id="import-drop-zone" class="import-drop-zone" style="
            border: 2px dashed var(--border-color);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
            margin-bottom: 12px;
        ">
            <div id="drop-zone-content">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto 8px; opacity: 0.5;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p style="margin: 0; color: var(--text-secondary); font-size: 13px;" data-i18n="dropZoneText">Drop JSON file here or click to select</p>
                <p style="margin: 4px 0 0; color: var(--text-tertiary); font-size: 11px;" data-i18n="dropZoneHint">Supports .json files exported from Chubby Cat</p>
            </div>
            <input type="file" id="import-file-input" accept=".json" style="display: none;">
        </div>

        <!-- Import Options -->
        <div id="import-options" style="display: none; margin-bottom: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 500; color: var(--text-primary);" data-i18n="importMode">Import Mode</span>
            </div>
            <div style="display: flex; gap: 12px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--text-secondary);">
                    <input type="radio" name="import-mode" value="merge" checked style="margin: 0;">
                    <span data-i18n="importModeMerge">Merge (keep existing)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--text-secondary);">
                    <input type="radio" name="import-mode" value="replace" style="margin: 0;">
                    <span data-i18n="importModeReplace">Replace (overwrite all)</span>
                </label>
            </div>
        </div>

        <!-- File Preview -->
        <div id="import-preview" style="display: none; margin-bottom: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 500; color: var(--text-primary);" data-i18n="filePreview">File Preview</span>
                <button id="import-clear-btn" class="btn-link" style="font-size: 11px; color: var(--text-tertiary); padding: 2px 6px;" data-i18n="clearSelection">Clear</button>
            </div>
            <div id="import-preview-content" style="font-size: 12px; color: var(--text-secondary);"></div>
        </div>

        <!-- Import Button & Status -->
        <div style="display: flex; align-items: center; gap: 12px;">
            <button id="import-configs-btn" class="btn-primary" style="padding: 8px 16px; font-size: 13px; flex-shrink: 0;" disabled>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span data-i18n="importButton">Import</span>
            </button>
            <div id="import-status" class="data-operation-status" style="display: none; font-size: 12px; padding: 6px 10px; border-radius: 6px; flex: 1;"></div>
        </div>
    </div>

    <!-- Divider -->
    <div style="height: 1px; background: var(--border-color); margin: 16px 0; opacity: 0.5;"></div>

    <!-- Security Warning -->
    <div class="security-notice" style="
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-secondary);
    ">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="#FFC107" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <div>
            <p style="margin: 0 0 4px; font-weight: 500; color: var(--text-primary);" data-i18n="securityWarningTitle">Security Notice</p>
            <p style="margin: 0; line-height: 1.4;" data-i18n="securityWarningText">Exported files contain your API keys in plain text. Store them securely and never share them publicly. Only import files from trusted sources.</p>
        </div>
    </div>
</div>`;
