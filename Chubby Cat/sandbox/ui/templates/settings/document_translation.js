export const DocumentTranslationSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="docTranslationModelTitle">文档解析模型</h4>
    <p class="setting-desc" data-i18n="docTranslationModelDesc">配置用于从 PDF 和图片中提取文字的 OCR 模型。</p>

    <div style="margin-top: 12px;">
        <label data-i18n="docParsingProvider" style="font-weight: 500; display: block; margin-bottom: 2px;">文档解析模型</label>
        <select id="doc-ocr-provider" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
            <option value="mistral">Mistral</option>
        </select>
    </div>

    <div style="margin-top: 12px;">
        <label data-i18n="apiKey" style="font-weight: 500; display: block; margin-bottom: 2px;">API 密钥</label>
        <input type="password" id="doc-ocr-api-key" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="docOcrApiKeyPlaceholder" placeholder="mistral-...">
    </div>

    <div style="margin-top: 12px;">
        <label data-i18n="baseUrl" style="font-weight: 500; display: block; margin-bottom: 2px;">基础 URL</label>
        <input type="text" id="doc-ocr-base-url" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="docOcrBaseUrlPlaceholder" placeholder="https://api.mistral.ai/v1/ocr">
    </div>

    <div style="margin-top: 12px;">
        <label data-i18n="docOcrModelName" style="font-weight: 500; display: block; margin-bottom: 2px;">模型名称</label>
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="doc-ocr-model" class="shortcut-input" style="flex: 1; text-align: left; box-sizing: border-box;" placeholder="mistral-ocr-latest" readonly>
            <button id="doc-ocr-unlock" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button" data-i18n="docOcrUnlock">修改</button>
        </div>
        <div id="doc-ocr-model-status" style="font-size: 12px; margin-top: 6px; color: var(--text-tertiary);" data-i18n="docOcrModelLockHint">模型名称默认锁定，点击修改可更改。</div>
    </div>

    <div style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 8px;">
        <div class="setting-desc" data-i18n="docTranslationSecurityNote">文档发送到解析模型进行 OCR，请保管好 API 密钥并仅上传可信文件。</div>
    </div>
</div>

<div class="setting-group">
    <h4 data-i18n="docProcessingTitle">文档处理</h4>
    <p class="setting-desc" data-i18n="docProcessingDesc">将内容发送至自定义 OpenAI API 模型前，先使用解析模型处理。</p>

    <div class="shortcut-row" style="margin-bottom: 8px;">
        <div style="flex: 1;">
            <label data-i18n="docProcessingToggle" style="font-weight: 500; display: block; margin-bottom: 2px;">启用文档处理模型</label>
            <span class="setting-desc" data-i18n="docProcessingToggleDesc">使用 OCR 预处理 PDF 和图片，再转发文本至主模型。</span>
        </div>
        <input type="checkbox" id="doc-processing-toggle" style="width: 20px; height: 20px; cursor: pointer;">
    </div>

    <div id="doc-processing-unavailable" style="display: none; font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;" data-i18n="docProcessingUnavailable">此选项仅适用于自定义 API 提供商。</div>

    <div style="margin-top: 6px; font-size: 12px; color: var(--text-tertiary);" id="doc-processing-scope">
        <div data-i18n="docProcessingScopeTitle" style="font-weight: 500; margin-bottom: 4px;">适用于：</div>
        <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
            <li data-i18n="docProcessingScopePdf">作为附件上传的 PDF 文件</li>
            <li data-i18n="docProcessingScopeImage">作为附件上传的图片文件</li>
            <li data-i18n="docProcessingScopeInlineImage">粘贴或直接输入的图片</li>
        </ul>
    </div>
</div>
`;
