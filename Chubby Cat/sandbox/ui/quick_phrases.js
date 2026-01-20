
// sandbox/ui/quick_phrases.js
import { t } from '../core/i18n.js';
import { requestQuickPhrasesFromStorage, saveQuickPhrasesToStorage } from '../../lib/messaging.js';

// Quick Phrases Controller
export class QuickPhrasesController {
    constructor(options = {}) {
        this.phrases = [];
        this.editingIndex = -1;
        this.isOpen = false;
        this.isModalOpen = false;
        this.inputFn = options.inputFn || null;
        this.isInitialized = false;
        this.resizeObserver = null;
        this.positionRaf = null;
        this.handleViewportChange = this.handleViewportChange.bind(this);

        // DOM Elements
        this.wrapper = null;
        this.btn = null;
        this.dropdown = null;
        this.list = null;
        this.emptyState = null;
        this.modal = null;
        this.modalTitle = null;
        this.modalInput = null;
        this.saveBtn = null;
        this.cancelBtn = null;
        this.closeBtn = null;
        this.addBtn = null;

        this.init();
    }

    init() {
        // Get DOM elements
        this.wrapper = document.getElementById('quick-phrases-wrapper');
        this.btn = document.getElementById('quick-phrases-btn');
        this.dropdown = document.getElementById('quick-phrases-dropdown');
        this.list = document.getElementById('quick-phrases-list');
        this.emptyState = document.getElementById('quick-phrases-empty');
        this.modal = document.getElementById('quick-phrase-modal');
        this.modalTitle = document.getElementById('quick-phrase-modal-title');
        this.modalInput = document.getElementById('quick-phrase-input');
        this.saveBtn = document.getElementById('quick-phrase-save-btn');
        this.cancelBtn = document.getElementById('quick-phrase-cancel-btn');
        this.closeBtn = document.getElementById('quick-phrase-modal-close');
        this.addBtn = document.getElementById('quick-phrases-add-btn');

        if (!this.wrapper || !this.btn) return;

        // Listen for restored phrases from storage
        window.addEventListener('message', (event) => {
            if (event.data && event.data.action === 'RESTORE_QUICK_PHRASES') {
                this.phrases = Array.isArray(event.data.payload) ? event.data.payload : [];
                this.isInitialized = true;
                this.render();
            }
        });

        // Request saved phrases from storage
        requestQuickPhrasesFromStorage();

        // Bind events
        this.bindEvents();
        this.setupObservers();

        // Initial render (empty, will be updated when phrases are loaded)
        this.render();
    }

    bindEvents() {
        // Toggle dropdown
        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Add button
        if (this.addBtn) {
            this.addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openModal();
            });
        }

        // Modal controls
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.savePhrase());
        }
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Enter key in modal input
        if (this.modalInput) {
            this.modalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.savePhrase();
                }
                if (e.key === 'Escape') {
                    this.closeModal();
                }
            });
        }

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.wrapper && !this.wrapper.contains(e.target)) {
                this.close();
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isModalOpen) {
                    this.closeModal();
                } else if (this.isOpen) {
                    this.close();
                }
            }
        });
    }

    setupObservers() {
        if (!this.wrapper || !this.btn || typeof ResizeObserver === 'undefined') return;

        this.resizeObserver = new ResizeObserver(() => {
            if (this.isOpen) {
                this.schedulePositionDropdown();
            }
        });

        this.resizeObserver.observe(this.wrapper);
        this.resizeObserver.observe(this.btn);

        if (this.dropdown) {
            this.resizeObserver.observe(this.dropdown);
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.attachViewportListeners();
        this.positionDropdown();
        this.wrapper.classList.add('open');
        this.btn.classList.add('active');
        this.schedulePositionDropdown();
    }

    close() {
        this.isOpen = false;
        this.isModalOpen = false;
        this.wrapper.classList.remove('open');
        this.btn.classList.remove('active');
        this.closeModal();
        this.detachViewportListeners();
    }

    attachViewportListeners() {
        window.addEventListener('resize', this.handleViewportChange);
        window.addEventListener('scroll', this.handleViewportChange, true);
    }

    detachViewportListeners() {
        window.removeEventListener('resize', this.handleViewportChange);
        window.removeEventListener('scroll', this.handleViewportChange, true);
    }

    handleViewportChange() {
        if (this.isOpen) {
            this.schedulePositionDropdown();
        }
    }

    schedulePositionDropdown() {
        if (this.positionRaf) {
            cancelAnimationFrame(this.positionRaf);
        }

        this.positionRaf = requestAnimationFrame(() => {
            this.positionRaf = null;
            if (this.isOpen) {
                this.positionDropdown();
            }
        });
    }

    positionDropdown() {
        if (!this.dropdown || !this.btn) return;

        const btnRect = this.btn.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const viewportPadding = 12;
        const gap = 8;
        const maxWidth = Math.max(240, viewportWidth - viewportPadding * 2);
        const dropdownWidth = Math.min(360, maxWidth);

        this.dropdown.style.width = `${dropdownWidth}px`;
        this.dropdown.style.maxHeight = '';

        const dropdownRect = this.dropdown.getBoundingClientRect();
        const dropdownHeight = dropdownRect.height || 0;
        const spaceAbove = btnRect.top - viewportPadding;
        const spaceBelow = viewportHeight - btnRect.bottom - viewportPadding;
        const fitsAbove = dropdownHeight + gap <= spaceAbove;
        const fitsBelow = dropdownHeight + gap <= spaceBelow;

        let placement = 'top';
        if (!fitsAbove && (fitsBelow || spaceBelow >= spaceAbove)) {
            placement = 'bottom';
        }

        const availableSpace = Math.max(
            0,
            (placement === 'top' ? spaceAbove : spaceBelow) - gap
        );

        if (availableSpace > 0) {
            this.dropdown.style.maxHeight = `${availableSpace}px`;
        }

        const finalHeight = this.dropdown.getBoundingClientRect().height || dropdownHeight;
        let top = placement === 'top'
            ? btnRect.top - gap - finalHeight
            : btnRect.bottom + gap;

        top = Math.max(
            viewportPadding,
            Math.min(top, viewportHeight - finalHeight - viewportPadding)
        );

        let left = btnRect.left + (btnRect.width / 2) - (dropdownWidth / 2);
        left = Math.max(
            viewportPadding,
            Math.min(left, viewportWidth - dropdownWidth - viewportPadding)
        );

        this.dropdown.style.top = `${top}px`;
        this.dropdown.style.left = `${left}px`;
        this.dropdown.dataset.placement = placement;

        if (this.list) {
            if (availableSpace > 0 && availableSpace < dropdownHeight) {
                const header = this.dropdown.querySelector('.quick-phrases-header');
                const headerHeight = header ? header.getBoundingClientRect().height : 0;
                const listMaxHeight = Math.max(0, availableSpace - headerHeight - 16);
                this.list.style.maxHeight = `${listMaxHeight}px`;
            } else {
                this.list.style.maxHeight = '';
            }
        }
    }

    openModal(index = -1) {
        this.editingIndex = index;
        this.isModalOpen = true;

        if (index >= 0 && this.phrases[index]) {
            // Editing existing phrase
            this.modalTitle.textContent = t('editQuickPhrase') || 'Edit Quick Phrase';
            this.modalInput.value = this.phrases[index];
        } else {
            // Adding new phrase
            this.modalTitle.textContent = t('addQuickPhrase') || 'Add Quick Phrase';
            this.modalInput.value = '';
        }

        this.modal.classList.add('open');

        // Focus input after animation
        setTimeout(() => {
            this.modalInput.focus();
        }, 100);

        if (this.isOpen) {
            this.schedulePositionDropdown();
        }
    }

    closeModal() {
        this.isModalOpen = false;
        this.editingIndex = -1;
        if (this.modal) {
            this.modal.classList.remove('open');
        }
        if (this.modalInput) {
            this.modalInput.value = '';
        }
    }

    savePhrase() {
        const text = this.modalInput.value.trim();
        if (!text) return;

        if (this.editingIndex >= 0) {
            // Update existing phrase
            this.phrases[this.editingIndex] = text;
        } else {
            // Add new phrase
            this.phrases.push(text);
        }

        this.savePhrases();
        this.render();
        this.closeModal();
    }

    deletePhrase(index) {
        if (index >= 0 && index < this.phrases.length) {
            this.phrases.splice(index, 1);
            this.savePhrases();
            this.render();
        }
    }

    selectPhrase(index) {
        if (index >= 0 && index < this.phrases.length && this.inputFn) {
            const phrase = this.phrases[index];
            const currentValue = this.inputFn.value;

            // Append phrase to input (with space if needed)
            if (currentValue && !currentValue.endsWith(' ') && !currentValue.endsWith('\n')) {
                this.inputFn.value = currentValue + ' ' + phrase;
            } else {
                this.inputFn.value = currentValue + phrase;
            }

            // Focus input and move cursor to end
            this.inputFn.focus();
            this.inputFn.setSelectionRange(this.inputFn.value.length, this.inputFn.value.length);

            // Trigger input event for auto-resize
            this.inputFn.dispatchEvent(new Event('input', { bubbles: true }));

            // Close dropdown
            this.close();
        }
    }

    render() {
        if (!this.list || !this.emptyState) return;

        // Clear current list
        this.list.innerHTML = '';

        if (this.phrases.length === 0) {
            this.emptyState.style.display = 'block';
            this.list.style.display = 'none';
        } else {
            this.emptyState.style.display = 'none';
            this.list.style.display = 'block';

            this.phrases.forEach((phrase, index) => {
                const item = this.createPhraseItem(phrase, index);
                this.list.appendChild(item);
            });
        }

        if (this.isOpen) {
            this.schedulePositionDropdown();
        }
    }

    createPhraseItem(phrase, index) {
        const item = document.createElement('div');
        item.className = 'quick-phrase-item';

        const text = document.createElement('span');
        text.className = 'quick-phrase-text';
        text.textContent = phrase;
        text.title = phrase;

        const actions = document.createElement('div');
        actions.className = 'quick-phrase-actions';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'quick-phrase-action-btn';
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        editBtn.title = t('edit') || 'Edit';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openModal(index);
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'quick-phrase-action-btn delete';
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        deleteBtn.title = t('delete') || 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deletePhrase(index);
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(text);
        item.appendChild(actions);

        // Click to select phrase
        item.addEventListener('click', () => {
            this.selectPhrase(index);
        });

        return item;
    }

    savePhrases() {
        // Use message-based storage via sidepanel bridge
        saveQuickPhrasesToStorage(this.phrases);
    }

    setInputElement(inputEl) {
        this.inputFn = inputEl;
    }
}
