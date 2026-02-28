
// sandbox/ui/templates/settings/model.js
// Model Configuration Template - extracted from connection.js

export const ModelSettingsTemplate = `
<div class="setting-group">
    <div style="margin-bottom: 12px;">
        <label data-i18n="connectionProvider" style="font-weight: 500; display: block; margin-bottom: 6px;">模型提供商</label>
        <select id="provider-select" class="shortcut-input" style="width: 100%; text-align: left; padding: 8px 12px;">
            <option value="web" data-i18n="providerWeb">Gemini 网页客户端（免费）</option>
            <option value="grok" data-i18n="providerGrok">Grok 网页客户端（免费）</option>
            <option value="official" data-i18n="providerOfficial">Gemini API</option>
            <option value="openai" data-i18n="providerOpenAI">OpenAI/Claude 兼容 API</option>
        </select>
    </div>

    <div id="api-key-container" style="display: none; flex-direction: column; gap: 12px; margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.03); border-radius: 8px;">
        <!-- Official API Fields -->
        <div id="official-fields" style="display: none; flex-direction: column; gap: 12px;">
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">基础 URL</label>
                <input type="text" id="official-base-url" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="https://generativelanguage.googleapis.com">
            </div>
            <div>
                <label data-i18n="apiKey" style="font-weight: 500; display: block; margin-bottom: 2px;">API 密钥</label>
                <input type="password" id="api-key-input" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="apiKeyPlaceholder" placeholder="Paste your Gemini API Key">
            </div>
            <div>
                <label data-i18n="officialModelsTitle" style="font-weight: 500; display: block; margin-bottom: 2px;">模型</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="official-model-input" class="shortcut-input" style="flex: 1; text-align: left; box-sizing: border-box;" data-i18n-placeholder="officialModelPlaceholder" placeholder="e.g. gemini-2.5-pro, gemini-1.5-flash">
                    <button id="official-add-model" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button" data-i18n="officialAddModel">添加</button>
                    <button id="official-cancel-model-edit" class="tool-btn" style="padding: 6px 10px; white-space: nowrap; display: none;" type="button" data-i18n="officialCancelEdit">取消</button>
                    <button id="official-fetch-models" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button">获取</button>
                </div>
                <div id="official-model-status" style="font-size: 12px; margin-top: 4px; display: none;"></div>
                <div id="official-fetch-status" style="font-size: 12px; margin-top: 4px; display: none;"></div>
                <div id="official-model-list" style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;"></div>
                <select id="official-model-dropdown" class="shortcut-input" style="width: 100%; margin-top: 6px; padding: 6px 12px; display: none;">
                    <option value="" disabled selected>-- 选择模型 --</option>
                </select>
            </div>
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">思考等级 (Gemini 3)</label>
                <select id="thinking-level-select" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
                    <option value="minimal">最小（仅 Flash）</option>
                    <option value="low">低（较快）</option>
                    <option value="medium">中（平衡）</option>
                    <option value="high">高（深度推理）</option>
                </select>
                <div style="font-size: 12px; color: #f57c00; margin-top: 4px;">Gemini 3pro只支持low和high的思考等级.</div>
            </div>
        </div>

        <!-- OpenAI Fields -->
        <div id="openai-fields" style="display: none; flex-direction: column; gap: 12px;">
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 2px;">提供商类型</label>
                <select id="openai-provider-type" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
                    <option value="openai">OpenAI 兼容</option>
                    <option value="claude">Claude (Anthropic)</option>
                </select>
            </div>

            <!-- Config Management Section -->
            <div>
                <label data-i18n="openaiConfigSection" style="font-weight: 500; display: block; margin-bottom: 6px;">API 配置</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select id="openai-config-select" class="shortcut-input" style="flex: 1; text-align: left; padding: 6px 12px;"></select>
                    <button id="openai-add-config" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="openaiAddConfig">添加</button>
                    <button id="openai-remove-config" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="openaiRemoveConfig">删除</button>
                </div>
            </div>

            <div id="openai-config-status" style="font-size: 12px; color: #4CAF50; opacity: 0.9; display: none;"></div>

            <div>
                <label data-i18n="openaiConfigName" style="font-weight: 500; display: block; margin-bottom: 2px;">配置名称</label>
                <input type="text" id="openai-config-name" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="openaiConfigNamePlaceholder" placeholder="e.g. Production API">
            </div>
            <div>
                <label data-i18n="baseUrl" style="font-weight: 500; display: block; margin-bottom: 2px;">基础 URL</label>
                <input type="text" id="openai-base-url" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="baseUrlPlaceholder" placeholder="https://api.openai.com/v1">
            </div>
            <div>
                <label data-i18n="apiKey" style="font-weight: 500; display: block; margin-bottom: 2px;">API 密钥</label>
                <input type="password" id="openai-api-key" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="apiKeyPlaceholder" placeholder="sk-...">
            </div>
            <div>
                <label data-i18n="openaiModelsTitle" style="font-weight: 500; display: block; margin-bottom: 2px;">模型</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="openai-model-input" class="shortcut-input" style="flex: 1; text-align: left; box-sizing: border-box;" data-i18n-placeholder="modelIdPlaceholder" placeholder="e.g. gpt-4o, claude-3-5-sonnet">
                    <button id="openai-add-model" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button" data-i18n="openaiAddModel">添加</button>
                    <button id="openai-cancel-model-edit" class="tool-btn" style="padding: 6px 10px; white-space: nowrap; display: none;" type="button" data-i18n="openaiCancelEdit">取消</button>
                    <button id="openai-fetch-models" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button">获取</button>
                </div>
                <div id="openai-model-status" style="font-size: 12px; margin-top: 4px; display: none;"></div>
                <div id="openai-fetch-status" style="font-size: 12px; margin-top: 4px; display: none;"></div>
                <div id="openai-model-list" style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;"></div>
                <select id="openai-model-dropdown" class="shortcut-input" style="width: 100%; margin-top: 6px; padding: 6px 12px; display: none;">
                    <option value="" disabled selected>-- 选择模型 --</option>
                </select>
            </div>
            <div>
                <label data-i18n="openaiTimeout" style="font-weight: 500; display: block; margin-bottom: 2px;">超时（ms）</label>
                <input type="number" id="openai-timeout" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="60000" value="60000">
            </div>
            <!-- Claude-specific options -->
            <div id="claude-options" style="display: none; flex-direction: column; gap: 12px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 6px; margin-top: 4px;">
                <div style="font-size: 12px; font-weight: 500; opacity: 0.85;">Claude 选项</div>
                <div>
                    <label style="font-weight: 500; display: block; margin-bottom: 2px;">最大 Token 数</label>
                    <input type="number" id="claude-max-tokens" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="8192" value="8192">
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="claude-thinking-enabled" />
                        <span>启用扩展思考</span>
                    </label>
                </div>
                <div id="claude-thinking-budget-container" style="display: none;">
                    <label style="font-weight: 500; display: block; margin-bottom: 2px;">思考预算（tokens）</label>
                    <input type="number" id="claude-thinking-budget" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" placeholder="10000" value="10000">
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="openai-set-default" />
                    <span data-i18n="openaiSetDefault">设为默认</span>
                </label>
            </div>
        </div>
    </div>
</div>`;
