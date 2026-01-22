// sandbox/ui/skills_dropdown.js
import { t } from '../core/i18n.js';
import { requestSkillsSettingsFromStorage } from '../../lib/messaging.js';
import { normalizeSkillsSettings } from '../../lib/skills/index.js';

export class SkillsDropdownController {
    constructor(options = {}) {
        this.inputFn = options.inputFn || null;
        this.settings = normalizeSkillsSettings();
        this.isOpen = false;
        this.isInitialized = false;
        this.isLoading = false;
        this.resizeObserver = null;
        this.positionRaf = null;

        this.handleViewportChange = this.handleViewportChange.bind(this);
        this.handleMessage = this.handleMessage.bind(this);

        // DOM Elements
        this.wrapper = null;
        this.btn = null;
        this.dropdown = null;
        this.list = null;
        this.emptyState = null;

        this.init();
    }

    init() {
        this.wrapper = document.getElementById('skills-wrapper');
        this.btn = document.getElementById('skills-btn');
        this.dropdown = document.getElementById('skills-dropdown');
        this.list = document.getElementById('skills-list');
        this.emptyState = document.getElementById('skills-empty');

        if (!this.wrapper || !this.btn) return;

        window.addEventListener('message', this.handleMessage);
        document.addEventListener('gemini-language-changed', () => this.render());

        this.bindEvents();
        this.setupObservers();
        this.render();
    }

    bindEvents() {
        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        document.addEventListener('click', (e) => {
            if (this.isOpen && this.wrapper && !this.wrapper.contains(e.target)) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
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

    handleMessage(event) {
        if (!event.data || event.data.action !== 'RESTORE_SKILLS_SETTINGS') return;
        this.settings = normalizeSkillsSettings(event.data.payload || {});
        this.isInitialized = true;
        this.isLoading = false;
        this.render();
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
        this.btn.setAttribute('aria-expanded', 'true');
        this.schedulePositionDropdown();
        this.requestSkills();
    }

    close() {
        this.isOpen = false;
        this.wrapper.classList.remove('open');
        this.btn.classList.remove('active');
        this.btn.setAttribute('aria-expanded', 'false');
        this.detachViewportListeners();
    }

    requestSkills() {
        if (!this.isInitialized) {
            this.isLoading = true;
            this.render();
        }
        requestSkillsSettingsFromStorage();
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
                const header = this.dropdown.querySelector('.skills-header');
                const headerHeight = header ? header.getBoundingClientRect().height : 0;
                const listMaxHeight = Math.max(0, availableSpace - headerHeight - 16);
                this.list.style.maxHeight = `${listMaxHeight}px`;
            } else {
                this.list.style.maxHeight = '';
            }
        }
    }

    render() {
        if (!this.list || !this.emptyState) return;

        this.list.innerHTML = '';

        if (!this.isInitialized) {
            if (this.isOpen) {
                this.showEmptyState(t('skillsLoading'));
            } else {
                this.emptyState.style.display = 'none';
                this.list.style.display = 'none';
            }
            return;
        }

        if (!this.settings.enabled) {
            this.showEmptyState(t('skillsDisabledNotice'));
            return;
        }

        const enabledSkills = this.settings.skills.filter((skill) => {
            if (skill.enabled === false) return false;
            if (skill.isCustom && !this.settings.customEnabled) return false;
            return true;
        });

        if (enabledSkills.length === 0) {
            const hasCustomEnabled = this.settings.skills.some((skill) => skill.isCustom && skill.enabled !== false);
            const hasBaseEnabled = this.settings.skills.some((skill) => !skill.isCustom && skill.enabled !== false);
            if (!this.settings.customEnabled && hasCustomEnabled && !hasBaseEnabled) {
                this.showEmptyState(t('skillsCustomDisabledNotice'));
            } else {
                this.showEmptyState(t('skillsEmpty'));
            }
            return;
        }

        this.emptyState.style.display = 'none';
        this.list.style.display = 'block';

        enabledSkills.forEach((skill) => {
            const item = this.createSkillItem(skill);
            this.list.appendChild(item);
        });

        if (this.isOpen) {
            this.schedulePositionDropdown();
        }
    }

    showEmptyState(message) {
        this.emptyState.style.display = 'block';
        this.list.style.display = 'none';
        this.emptyState.textContent = message || '';
    }

    createSkillItem(skill) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'skills-item';
        button.dataset.skillId = skill.id;

        const title = document.createElement('div');
        title.className = 'skills-item-title';
        title.textContent = skill.name || skill.id;

        const id = document.createElement('span');
        id.className = 'skills-item-id';
        id.textContent = skill.id;
        title.appendChild(id);

        const desc = document.createElement('div');
        desc.className = 'skills-item-desc';
        desc.textContent = this.getShortDescription(skill);

        button.appendChild(title);
        button.appendChild(desc);

        button.addEventListener('click', () => {
            this.selectSkill(skill);
        });

        return button;
    }

    getShortDescription(skill) {
        const raw = (skill.shortDescription || skill.description || '').trim();
        if (!raw) return '';
        if (raw.length <= 17) return raw;
        return raw.slice(0, 17);
    }

    selectSkill(skill) {
        if (!this.inputFn || !skill) return;
        const command = `/skill ${skill.id}`;
        const currentValue = this.inputFn.value || '';
        const needsSpace = currentValue && !/\s$/.test(currentValue);
        this.inputFn.value = needsSpace
            ? `${currentValue} ${command}`
            : `${currentValue}${command}`;

        this.inputFn.focus();
        this.inputFn.setSelectionRange(this.inputFn.value.length, this.inputFn.value.length);
        this.inputFn.dispatchEvent(new Event('input', { bubbles: true }));

        this.close();
    }

    setInputElement(inputEl) {
        this.inputFn = inputEl;
    }
}
