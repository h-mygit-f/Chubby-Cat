
// sandbox/ui/settings/sections/data_management.js

export class DataManagementSection {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};
        this.selectedFile = null;
        this.parsedData = null;
        this.isDragging = false;

        this.queryElements();
        this.bindEvents();
    }

    queryElements() {
        const get = (id) => document.getElementById(id);
        this.elements = {
            exportBtn: get('export-configs-btn'),
            exportStatus: get('export-status'),
            importDropZone: get('import-drop-zone'),
            importFileInput: get('import-file-input'),
            importOptions: get('import-options'),
            importPreview: get('import-preview'),
            importPreviewContent: get('import-preview-content'),
            importClearBtn: get('import-clear-btn'),
            importBtn: get('import-configs-btn'),
            importStatus: get('import-status'),
            dropZoneContent: get('drop-zone-content')
        };
    }

    bindEvents() {
        const {
            exportBtn,
            importDropZone,
            importFileInput,
            importClearBtn,
            importBtn
        } = this.elements;

        // Export button
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        // Import drop zone - click
        if (importDropZone && importFileInput) {
            importDropZone.addEventListener('click', () => importFileInput.click());

            // Drag & Drop events
            importDropZone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            importDropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            importDropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            importDropZone.addEventListener('drop', (e) => this.handleDrop(e));
        }

        // File input change
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }

        // Clear button
        if (importClearBtn) {
            importClearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearSelection();
            });
        }

        // Import button
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImport());
        }
    }

    // --- Drag & Drop Handlers ---

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
        this.updateDropZoneStyle(true);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        // Only deactivate if we've left the drop zone entirely
        const rect = this.elements.importDropZone.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
            this.isDragging = false;
            this.updateDropZoneStyle(false);
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = false;
        this.updateDropZoneStyle(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                this.handleFileSelect(file);
            } else {
                this.showImportStatus('Please select a JSON file', true);
            }
        }
    }

    updateDropZoneStyle(active) {
        const { importDropZone } = this.elements;
        if (!importDropZone) return;

        if (active) {
            importDropZone.style.borderColor = 'var(--accent-color)';
            importDropZone.style.background = 'rgba(var(--accent-color-rgb), 0.1)';
        } else {
            importDropZone.style.borderColor = 'var(--border-color)';
            importDropZone.style.background = 'var(--bg-secondary)';
        }
    }

    // --- File Selection & Parsing ---

    async handleFileSelect(file) {
        this.selectedFile = file;

        try {
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);

            // Validate structure
            const validation = this.validateImportData(data);
            if (!validation.valid) {
                this.showImportStatus(validation.error, true);
                this.clearSelection();
                return;
            }

            this.parsedData = data;
            this.showPreview(data, file.name);
            this.showImportStatus('', false);

        } catch (err) {
            console.error('File parse error:', err);
            this.showImportStatus('Invalid JSON file format', true);
            this.clearSelection();
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    validateImportData(data) {
        // Check for required metadata
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid file structure' };
        }

        // Check version and export source
        if (!data.exportedFrom || data.exportedFrom !== 'chubby-cat') {
            return { valid: false, error: 'File was not exported from Chubby Cat' };
        }

        if (!data.version) {
            return { valid: false, error: 'Missing export version' };
        }

        // Check for configs array
        if (!data.openaiConfigs || !Array.isArray(data.openaiConfigs)) {
            return { valid: false, error: 'No configurations found in file' };
        }

        // Basic config validation
        for (const cfg of data.openaiConfigs) {
            if (!cfg.id || typeof cfg.id !== 'string') {
                return { valid: false, error: 'Invalid configuration ID found' };
            }
        }

        return { valid: true };
    }

    showPreview(data, filename) {
        const { importOptions, importPreview, importPreviewContent, importBtn } = this.elements;

        if (importOptions) importOptions.style.display = 'block';
        if (importPreview) importPreview.style.display = 'block';
        if (importBtn) importBtn.disabled = false;

        if (importPreviewContent) {
            const configCount = data.openaiConfigs?.length || 0;
            const exportDate = data.exportedAt ? new Date(data.exportedAt).toLocaleString() : 'Unknown';

            // Mask API keys for preview
            const configSummary = (data.openaiConfigs || []).map(cfg => {
                const maskedKey = cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}...${cfg.apiKey.slice(-4)}` : '(empty)';
                return `<div style="padding: 4px 0; border-bottom: 1px solid var(--border-color);">
                    <strong>${this.escapeHtml(cfg.name || 'Unnamed')}</strong>
                    <span style="color: var(--text-tertiary); margin-left: 8px;">API Key: ${maskedKey}</span>
                </div>`;
            }).join('');

            importPreviewContent.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <span style="color: var(--text-tertiary);">File:</span> ${this.escapeHtml(filename)}<br>
                    <span style="color: var(--text-tertiary);">Exported:</span> ${exportDate}<br>
                    <span style="color: var(--text-tertiary);">Configurations:</span> ${configCount}
                </div>
                <div style="max-height: 120px; overflow-y: auto; font-size: 11px;">
                    ${configSummary || '<em>No configurations</em>'}
                </div>
            `;
        }

        // Update drop zone to show selected file
        const { dropZoneContent } = this.elements;
        if (dropZoneContent) {
            dropZoneContent.innerHTML = `
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="#4CAF50" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto 8px;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <p style="margin: 0; color: var(--text-primary); font-size: 13px; font-weight: 500;">${this.escapeHtml(filename)}</p>
                <p style="margin: 4px 0 0; color: var(--text-tertiary); font-size: 11px;">${data.openaiConfigs?.length || 0} configuration(s) found</p>
            `;
        }
    }

    clearSelection() {
        this.selectedFile = null;
        this.parsedData = null;

        const { importOptions, importPreview, importBtn, importFileInput, dropZoneContent } = this.elements;

        if (importOptions) importOptions.style.display = 'none';
        if (importPreview) importPreview.style.display = 'none';
        if (importBtn) importBtn.disabled = true;
        if (importFileInput) importFileInput.value = '';

        // Restore default drop zone content
        if (dropZoneContent) {
            dropZoneContent.innerHTML = `
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto 8px; opacity: 0.5;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p style="margin: 0; color: var(--text-secondary); font-size: 13px;" data-i18n="dropZoneText">Drop JSON file here or click to select</p>
                <p style="margin: 4px 0 0; color: var(--text-tertiary); font-size: 11px;" data-i18n="dropZoneHint">Supports .json files exported from Chubby Cat</p>
            `;
        }

        this.showImportStatus('', false);
    }

    // --- Export Handler ---

    handleExport() {
        this.showExportStatus('Preparing export...', false);
        this.fire('onExport');
    }

    // --- Import Handler ---

    handleImport() {
        if (!this.parsedData) {
            this.showImportStatus('No file selected', true);
            return;
        }

        // Get import mode
        const modeRadios = document.querySelectorAll('input[name="import-mode"]');
        let mode = 'merge';
        modeRadios.forEach(radio => {
            if (radio.checked) mode = radio.value;
        });

        this.showImportStatus('Importing configurations...', false);
        this.fire('onImport', { data: this.parsedData, mode: mode });
    }

    // --- Status Display ---

    showExportStatus(message, isError = false) {
        const { exportStatus } = this.elements;
        if (!exportStatus) return;

        if (!message) {
            exportStatus.style.display = 'none';
            return;
        }

        exportStatus.style.display = 'block';
        exportStatus.textContent = message;
        exportStatus.style.background = isError ? 'rgba(176, 0, 32, 0.1)' : 'rgba(76, 175, 80, 0.1)';
        exportStatus.style.color = isError ? '#b00020' : '#4CAF50';

        // Auto-hide success after 3 seconds
        if (!isError) {
            setTimeout(() => {
                if (exportStatus.textContent === message) {
                    exportStatus.style.display = 'none';
                }
            }, 3000);
        }
    }

    showImportStatus(message, isError = false) {
        const { importStatus } = this.elements;
        if (!importStatus) return;

        if (!message) {
            importStatus.style.display = 'none';
            return;
        }

        importStatus.style.display = 'block';
        importStatus.textContent = message;
        importStatus.style.background = isError ? 'rgba(176, 0, 32, 0.1)' : 'rgba(76, 175, 80, 0.1)';
        importStatus.style.color = isError ? '#b00020' : '#4CAF50';

        // Auto-hide success after 3 seconds
        if (!isError) {
            setTimeout(() => {
                if (importStatus.textContent === message) {
                    importStatus.style.display = 'none';
                }
            }, 3000);
        }
    }

    // --- Utility ---

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Public API ---

    setExportResult(success, message) {
        this.showExportStatus(message, !success);
    }

    setImportResult(success, message) {
        this.showImportStatus(message, !success);
        if (success) {
            this.clearSelection();
        }
    }

    fire(event, data) {
        if (this.callbacks[event]) this.callbacks[event](data);
    }
}
