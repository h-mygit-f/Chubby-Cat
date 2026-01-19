// sandbox/ui/settings/sections/document_translation.js
import { t } from '../../../core/i18n.js';

export class DocumentTranslationSection {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};
        this.modelUnlocked = false;
        this._modelValue = '';
        this.queryElements();
        this.bindEvents();
    }

    queryElements() {
        const get = (id) => document.getElementById(id);
        this.elements = {
            docOcrProvider: get('doc-ocr-provider'),
            docOcrApiKey: get('doc-ocr-api-key'),
            docOcrBaseUrl: get('doc-ocr-base-url'),
            docOcrModel: get('doc-ocr-model'),
            docOcrUnlock: get('doc-ocr-unlock'),
            docOcrModelStatus: get('doc-ocr-model-status'),
            docProcessingToggle: get('doc-processing-toggle'),
            docProcessingUnavailable: get('doc-processing-unavailable')
        };
    }

    bindEvents() {
        const {
            docOcrProvider,
            docOcrApiKey,
            docOcrBaseUrl,
            docOcrModel,
            docOcrUnlock,
            docProcessingToggle
        } = this.elements;

        if (docOcrProvider) docOcrProvider.addEventListener('change', () => this.fire('onDocOcrChange'));
        if (docOcrApiKey) docOcrApiKey.addEventListener('input', () => this.fire('onDocOcrChange'));
        if (docOcrBaseUrl) docOcrBaseUrl.addEventListener('input', () => this.fire('onDocOcrChange'));
        if (docOcrModel) docOcrModel.addEventListener('input', () => this.fire('onDocOcrChange'));

        if (docOcrUnlock && docOcrModel) {
            docOcrUnlock.addEventListener('click', () => this._unlockModelEdit());
        }

        if (docProcessingToggle) {
            docProcessingToggle.addEventListener('change', (e) => this.fire('onDocProcessingToggle', e.target.checked));
        }
    }

    _unlockModelEdit() {
        const { docOcrModel, docOcrModelStatus } = this.elements;
        if (!docOcrModel || this.modelUnlocked) return;

        const first = confirm(t('docOcrModelEditWarning'));
        if (!first) return;
        const second = confirm(t('docOcrModelEditConfirm'));
        if (!second) return;

        this.modelUnlocked = true;
        docOcrModel.removeAttribute('readonly');
        if (docOcrModelStatus) {
            docOcrModelStatus.textContent = t('docOcrModelUnlocked');
            docOcrModelStatus.style.color = 'var(--text-secondary)';
        }
        docOcrModel.focus();
    }

    _lockModelEdit() {
        const { docOcrModel, docOcrModelStatus } = this.elements;
        this.modelUnlocked = false;
        if (docOcrModel) {
            docOcrModel.setAttribute('readonly', 'readonly');
        }
        if (docOcrModelStatus) {
            docOcrModelStatus.textContent = t('docOcrModelLockHint');
            docOcrModelStatus.style.color = 'var(--text-tertiary)';
        }
    }

    setProvider(provider) {
        const { docProcessingToggle, docProcessingUnavailable } = this.elements;
        const isOpenai = provider === 'openai';
        if (docProcessingToggle) {
            docProcessingToggle.disabled = !isOpenai;
        }
        if (docProcessingUnavailable) {
            docProcessingUnavailable.style.display = isOpenai ? 'none' : 'block';
        }
    }

    setData(data) {
        const {
            docOcrProvider,
            docOcrApiKey,
            docOcrBaseUrl,
            docOcrModel,
            docProcessingToggle
        } = this.elements;

        if (docOcrProvider) docOcrProvider.value = data.docProcessingProvider || 'mistral';
        if (docOcrApiKey) docOcrApiKey.value = data.docProcessingApiKey || '';
        if (docOcrBaseUrl) docOcrBaseUrl.value = data.docProcessingBaseUrl || 'https://api.mistral.ai/v1/ocr';
        if (docOcrModel) docOcrModel.value = data.docProcessingModel || 'mistral-ocr-latest';
        if (docProcessingToggle) docProcessingToggle.checked = data.docProcessingEnabled === true;

        this._modelValue = docOcrModel ? docOcrModel.value : '';
        this._lockModelEdit();
        this.setProvider(data.provider || 'web');
    }

    getData() {
        const {
            docOcrProvider,
            docOcrApiKey,
            docOcrBaseUrl,
            docOcrModel,
            docProcessingToggle
        } = this.elements;

        return {
            docProcessingProvider: docOcrProvider ? docOcrProvider.value : 'mistral',
            docProcessingApiKey: docOcrApiKey ? docOcrApiKey.value.trim() : '',
            docProcessingBaseUrl: docOcrBaseUrl ? docOcrBaseUrl.value.trim() : '',
            docProcessingModel: docOcrModel ? docOcrModel.value.trim() : '',
            docProcessingEnabled: docProcessingToggle ? docProcessingToggle.checked === true : false
        };
    }

    fire(event, data) {
        if (this.callbacks[event]) this.callbacks[event](data);
    }
}
