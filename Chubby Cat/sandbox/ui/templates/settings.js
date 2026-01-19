
import { ModelSettingsTemplate } from './settings/model.js';
import { McpSettingsTemplate } from './settings/mcp.js';
import { GeneralSettingsTemplate } from './settings/general.js';
import { AppearanceSettingsTemplate } from './settings/appearance.js';
import { ShortcutsSettingsTemplate } from './settings/shortcuts.js';
import { DataManagementSettingsTemplate } from './settings/data_management.js';
import { AboutSettingsTemplate } from './settings/about.js';

export const SettingsTemplate = `
    <!-- SETTINGS -->
    <div id="settings-modal" class="settings-modal">
        <div class="settings-content">
            <div class="settings-header">
                <h3 data-i18n="settingsTitle">Settings</h3>
                <div class="settings-header-actions">
                    <button id="toggle-fullscreen" class="icon-btn small" data-i18n-title="toggleFullscreen" title="Toggle Fullscreen">
                        <svg id="fullscreen-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                        <svg id="minimize-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                            <polyline points="4 14 10 14 10 20"></polyline>
                            <polyline points="20 10 14 10 14 4"></polyline>
                            <line x1="14" y1="10" x2="21" y2="3"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    </button>
                    <button id="close-settings" class="icon-btn small" data-i18n-title="close" title="Close">✕</button>
                </div>
            </div>
            <div class="settings-layout">
                <!-- Left Navigation -->
                <nav class="settings-nav">
                    <div class="settings-nav-item active" data-panel="model">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                        <span>模型配置</span>
                    </div>
                    <div class="settings-nav-item" data-panel="mcp">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                            <rect x="9" y="9" width="6" height="6"></rect>
                            <line x1="9" y1="1" x2="9" y2="4"></line>
                            <line x1="15" y1="1" x2="15" y2="4"></line>
                            <line x1="9" y1="20" x2="9" y2="23"></line>
                            <line x1="15" y1="20" x2="15" y2="23"></line>
                            <line x1="20" y1="9" x2="23" y2="9"></line>
                            <line x1="20" y1="14" x2="23" y2="14"></line>
                            <line x1="1" y1="9" x2="4" y2="9"></line>
                            <line x1="1" y1="14" x2="4" y2="14"></line>
                        </svg>
                        <span>MCP配置</span>
                    </div>
                    <div class="settings-nav-item" data-panel="general">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        <span>常规配置</span>
                    </div>
                    <div class="settings-nav-item" data-panel="data">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                        <span>数据管理</span>
                    </div>
                    <div class="settings-nav-item" data-panel="about">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>关于</span>
                    </div>
                </nav>

                <!-- Right Content Panels -->
                <div class="settings-panels">
                    <!-- Model Panel -->
                    <div class="settings-panel active" data-panel="model">
                        <div class="settings-panel-header">
                            <h4 data-i18n="modelConfigTitle">Model Configuration</h4>
                            <p class="settings-panel-desc" data-i18n="modelConfigDesc">Configure model providers and API keys</p>
                        </div>
                        <div class="settings-panel-content">
                            ${ModelSettingsTemplate}
                        </div>
                    </div>

                    <!-- MCP Panel -->
                    <div class="settings-panel" data-panel="mcp">
                        <div class="settings-panel-header">
                            <h4 data-i18n="mcpConfigTitle">MCP Configuration</h4>
                            <p class="settings-panel-desc" data-i18n="mcpConfigDesc">Manage external MCP tool servers</p>
                        </div>
                        <div class="settings-panel-content">
                            ${McpSettingsTemplate}
                        </div>
                    </div>

                    <!-- General Panel -->
                    <div class="settings-panel" data-panel="general">
                        <div class="settings-panel-header">
                            <h4 data-i18n="generalConfigTitle">General Settings</h4>
                            <p class="settings-panel-desc" data-i18n="generalConfigDesc">General options, appearance and shortcuts</p>
                        </div>
                        <div class="settings-panel-content">
                            ${GeneralSettingsTemplate}
                            ${AppearanceSettingsTemplate}
                            ${ShortcutsSettingsTemplate}
                        </div>
                    </div>

                    <!-- Data Panel -->
                    <div class="settings-panel" data-panel="data">
                        <div class="settings-panel-header">
                            <h4 data-i18n="dataConfigTitle">Data Management</h4>
                            <p class="settings-panel-desc" data-i18n="dataConfigDesc">Import, export and manage your data</p>
                        </div>
                        <div class="settings-panel-content">
                            ${DataManagementSettingsTemplate}
                        </div>
                    </div>

                    <!-- About Panel -->
                    <div class="settings-panel" data-panel="about">
                        <div class="settings-panel-header">
                            <h4 data-i18n="aboutConfigTitle">About</h4>
                            <p class="settings-panel-desc" data-i18n="aboutConfigDesc">Version info, logs and support</p>
                        </div>
                        <div class="settings-panel-content">
                            ${AboutSettingsTemplate}
                        </div>
                    </div>

                    <!-- Panel Footer (Save/Reset) -->
                    <div class="settings-panel-footer">
                        <button id="reset-shortcuts" class="btn-secondary" data-i18n="resetDefault">Reset Default</button>
                        <button id="save-shortcuts" class="btn-primary" data-i18n="saveChanges">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- UNSAVED CHANGES CONFIRM DIALOG -->
    <div id="unsaved-confirm-modal" class="confirm-modal">
        <div class="confirm-content">
            <div class="confirm-header">
                <span class="confirm-icon">⚠️</span>
                <h4 data-i18n="unsavedChangesTitle">Unsaved Changes</h4>
            </div>
            <div class="confirm-body">
                <p data-i18n="unsavedChangesMessage">You have unsaved changes. What would you like to do?</p>
            </div>
            <div class="confirm-actions">
                <button id="confirm-discard" class="btn-secondary" data-i18n="discardChanges">Discard</button>
                <button id="confirm-save" class="btn-primary" data-i18n="saveChanges">Save Changes</button>
            </div>
        </div>
    </div>
`;
