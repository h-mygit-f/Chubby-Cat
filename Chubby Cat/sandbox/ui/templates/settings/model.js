
// sandbox/ui/templates/settings/model.js
// Model Configuration Template - extracted from connection.js

export const ModelSettingsTemplate = `
<div class="setting-group">
    <div style="margin-bottom: 12px;">
        <label data-i18n="connectionProvider" style="font-weight: 500; display: block; margin-bottom: 6px;">Model Provider</label>
        <select id="provider-select" class="shortcut-input" style="width: 100%; text-align: left; padding: 8px 12px;">
            <option value="web" data-i18n="providerWeb">Gemini Web Client (Free)</option>
            <option value="grok" data-i18n="providerGrok">Grok Web Client (Free)</option>
            <option value="official" data-i18n="providerOfficial">Gemini API</option>
            <option value="openai" data-i18n="providerOpenAI">OpenAI/Claude Compatible API</option>
        </select>
    </div>

    <div id="api-key-container" style="display: none; flex-direction: column; gap: 12px; margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.03); border-radius: 8px;">
        <!-- Official API Fields -->
        <div id="official-fields" style="display: none; flex-direction: column; gap: 12px;">
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">Base URL</label>
                <input type="text" id="official-base-url" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="https://generativelanguage.googleapis.com">
            </div>
            <div>
                <label data-i18n="apiKey" style="font-weight: 500; display: block; margin-bottom: 2px;">API Key</label>
                <input type="password" id="api-key-input" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="apiKeyPlaceholder" placeholder="Paste your Gemini API Key">
            </div>
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">Model IDs (Comma separated)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="official-model" class="shortcut-input" style="flex: 1; text-align: left; box-sizing: border-box;" placeholder="e.g. gemini-2.5-pro, gemini-1.5-flash">
                    <button id="official-fetch-models" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button">获取</button>
                </div>
                <div id="official-fetch-status" style="font-size: 12px; margin-top: 4px; display: none;"></div>
                <select id="official-model-dropdown" class="shortcut-input" style="width: 100%; margin-top: 6px; padding: 6px 12px; display: none;">
                    <option value="" disabled selected>-- 选择模型 --</option>
                </select>
            </div>
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">Thinking Level (Gemini 3)</label>
                <select id="thinking-level-select" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
                    <option value="minimal">Minimal (Flash Only)</option>
                    <option value="low">Low (Faster)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Deep Reasoning)</option>
                </select>
            </div>
        </div>

        <!-- OpenAI Fields -->
        <div id="openai-fields" style="display: none; flex-direction: column; gap: 12px;">
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">Provider Type</label>
                <select id="openai-provider-type" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
                    <option value="openai">OpenAI Compatible</option>
                    <option value="claude">Claude (Anthropic)</option>
                </select>
            </div>

            <!-- Config Management Section -->
            <div>
                <label data-i18n="openaiConfigSection" style="font-weight: 500; display: block; margin-bottom: 6px;">API Configuration</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select id="openai-config-select" class="shortcut-input" style="flex: 1; text-align: left; padding: 6px 12px;"></select>
                    <button id="openai-add-config" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="openaiAddConfig">Add</button>
                    <button id="openai-remove-config" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="openaiRemoveConfig">Remove</button>
                </div>
            </div>

            <div id="openai-config-status" style="font-size: 12px; color: #4CAF50; opacity: 0.9; display: none;"></div>

            <div>
                <label data-i18n="openaiConfigName" style="font-weight: 500; display: block; margin-bottom: 2px;">Configuration Name</label>
                <input type="text" id="openai-config-name" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="openaiConfigNamePlaceholder" placeholder="e.g. Production API">
            </div>
            <div>
                <label data-i18n="baseUrl" style="font-weight: 500; display: block; margin-bottom: 2px;">Base URL</label>
                <input type="text" id="openai-base-url" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="baseUrlPlaceholder" placeholder="https://api.openai.com/v1">
            </div>
            <div>
                <label data-i18n="apiKey" style="font-weight: 500; display: block; margin-bottom: 2px;">API Key</label>
                <input type="password" id="openai-api-key" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="apiKeyPlaceholder" placeholder="sk-...">
            </div>
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">Model IDs (Comma separated)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="openai-model" class="shortcut-input" style="flex: 1; text-align: left; box-sizing: border-box;" placeholder="e.g. gpt-4o, claude-3-5-sonnet">
                    <button id="openai-fetch-models" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button">获取</button>
                </div>
                <div id="openai-fetch-status" style="font-size: 12px; margin-top: 4px; display: none;"></div>
                <select id="openai-model-dropdown" class="shortcut-input" style="width: 100%; margin-top: 6px; padding: 6px 12px; display: none;">
                    <option value="" disabled selected>-- 选择模型 --</option>
                </select>
            </div>
            <div>
                <label data-i18n="openaiTimeout" style="font-weight: 500; display: block; margin-bottom: 2px;">Timeout (ms)</label>
                <input type="number" id="openai-timeout" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="60000" value="60000">
            </div>
            <!-- Claude-specific options -->
            <div id="claude-options" style="display: none; flex-direction: column; gap: 12px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 6px; margin-top: 4px;">
                <div style="font-size: 12px; font-weight: 500; opacity: 0.85;">Claude Options</div>
                <div>
                    <label style="font-weight: 500; display: block; margin-bottom: 2px;">Max Tokens</label>
                    <input type="number" id="claude-max-tokens" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="8192" value="8192">
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="claude-thinking-enabled" />
                        <span>Enable Extended Thinking</span>
                    </label>
                </div>
                <div id="claude-thinking-budget-container" style="display: none;">
                    <label style="font-weight: 500; display: block; margin-bottom: 2px;">Thinking Budget (tokens)</label>
                    <input type="number" id="claude-thinking-budget" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="10000" value="10000">
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="openai-set-default" />
                    <span data-i18n="openaiSetDefault">Set as Default</span>
                </label>
            </div>
        </div>
    </div>
</div>`;
