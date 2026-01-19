export const DocumentTranslationSettingsTemplate = `
<div class="setting-group">
    <h4 data-i18n="docTranslationModelTitle">Document Parsing Model</h4>
    <p class="setting-desc" data-i18n="docTranslationModelDesc">Configure the OCR model used to extract text from PDFs and images.</p>

    <div style="margin-top: 12px;">
        <label data-i18n="docParsingProvider" style="font-weight: 500; display: block; margin-bottom: 2px;">Document Parsing Model</label>
        <select id="doc-ocr-provider" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;">
            <option value="mistral">Mistral</option>
        </select>
    </div>

    <div style="margin-top: 12px;">
        <label data-i18n="apiKey" style="font-weight: 500; display: block; margin-bottom: 2px;">API Key</label>
        <input type="password" id="doc-ocr-api-key" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="docOcrApiKeyPlaceholder" placeholder="mistral-...">
    </div>

    <div style="margin-top: 12px;">
        <label data-i18n="baseUrl" style="font-weight: 500; display: block; margin-bottom: 2px;">Base URL</label>
        <input type="text" id="doc-ocr-base-url" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;" data-i18n-placeholder="docOcrBaseUrlPlaceholder" placeholder="https://api.mistral.ai/v1/ocr">
    </div>

    <div style="margin-top: 12px;">
        <label data-i18n="docOcrModelName" style="font-weight: 500; display: block; margin-bottom: 2px;">Model Name</label>
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="doc-ocr-model" class="shortcut-input" style="flex: 1; text-align: left; box-sizing: border-box;" placeholder="mistral-ocr-latest" readonly>
            <button id="doc-ocr-unlock" class="tool-btn" style="padding: 6px 10px; white-space: nowrap;" type="button" data-i18n="docOcrUnlock">Modify</button>
        </div>
        <div id="doc-ocr-model-status" style="font-size: 12px; margin-top: 6px; color: var(--text-tertiary);" data-i18n="docOcrModelLockHint">Model name is locked by default. Click Modify to change.</div>
    </div>

    <div style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 8px;">
        <div class="setting-desc" data-i18n="docTranslationSecurityNote">Documents are sent to the parsing model for OCR. Keep API keys secure and only upload trusted files.</div>
    </div>
</div>

<div class="setting-group">
    <h4 data-i18n="docProcessingTitle">Document Processing</h4>
    <p class="setting-desc" data-i18n="docProcessingDesc">Use the parsing model before sending content to your custom OpenAI API model.</p>

    <div class="shortcut-row" style="margin-bottom: 8px;">
        <div style="flex: 1;">
            <label data-i18n="docProcessingToggle" style="font-weight: 500; display: block; margin-bottom: 2px;">Use Document Processing Model</label>
            <span class="setting-desc" data-i18n="docProcessingToggleDesc">Preprocess PDFs and images with OCR, then forward text to your main model.</span>
        </div>
        <input type="checkbox" id="doc-processing-toggle" style="width: 20px; height: 20px; cursor: pointer;">
    </div>

    <div id="doc-processing-unavailable" style="display: none; font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;" data-i18n="docProcessingUnavailable">This option is available only for the Custom API provider.</div>

    <div style="margin-top: 6px; font-size: 12px; color: var(--text-tertiary);" id="doc-processing-scope">
        <div data-i18n="docProcessingScopeTitle" style="font-weight: 500; margin-bottom: 4px;">Applies to:</div>
        <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
            <li data-i18n="docProcessingScopePdf">PDF files uploaded as attachments</li>
            <li data-i18n="docProcessingScopeImage">Image files uploaded as attachments</li>
            <li data-i18n="docProcessingScopeInlineImage">Images pasted or directly input</li>
        </ul>
    </div>
</div>
`;
