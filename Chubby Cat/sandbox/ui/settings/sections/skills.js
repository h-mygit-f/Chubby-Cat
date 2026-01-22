// sandbox/ui/settings/sections/skills.js
import {
    normalizeSkillsSettings,
    executeSkill,
    getSkillById,
    validateCustomSkill,
    getCustomSkillTokens,
    getCustomSkillLimits
} from '../../../../lib/skills/index.js';
import { t } from '../../../core/i18n.js';

export class SkillsSection {
    constructor() {
        this.elements = {};
        this.settings = normalizeSkillsSettings();
        this.customTokens = getCustomSkillTokens();
        this.customLimits = getCustomSkillLimits();
        this.queryElements();
        this.bindEvents();
        this.render();
    }

    queryElements() {
        const get = (id) => document.getElementById(id);
        this.elements = {
            enabledToggle: get('skills-enabled'),
            list: get('skills-list'),
            runnerSelect: get('skills-runner-select'),
            runnerInput: get('skills-runner-input'),
            runnerRun: get('skills-runner-run'),
            runnerStatus: get('skills-runner-status'),
            runnerOutput: get('skills-runner-output'),
            customEnabledToggle: get('skills-custom-enabled'),
            customList: get('skills-custom-list'),
            customEmpty: get('skills-custom-empty'),
            customId: get('skills-custom-id'),
            customName: get('skills-custom-name'),
            customDescription: get('skills-custom-description'),
            customShortDescription: get('skills-custom-short-desc'),
            customInputHint: get('skills-custom-input-hint'),
            customTemplate: get('skills-custom-template'),
            customAdd: get('skills-custom-add'),
            customError: get('skills-custom-error'),
            customTokensHint: get('skills-custom-tokens')
        };
    }

    bindEvents() {
        const { enabledToggle, runnerRun, runnerSelect, customEnabledToggle, customAdd } = this.elements;

        if (enabledToggle) {
            enabledToggle.addEventListener('change', (e) => {
                this.settings.enabled = e.target.checked;
                this._setRunnerEnabled(this.settings.enabled);
            });
        }

        if (customEnabledToggle) {
            customEnabledToggle.addEventListener('change', (e) => {
                this.settings.customEnabled = e.target.checked;
                this._setCustomEnabled(this.settings.customEnabled);
                this.renderRunnerOptions();
            });
        }

        if (runnerRun) {
            runnerRun.addEventListener('click', () => this.handleRun());
        }

        if (runnerSelect) {
            runnerSelect.addEventListener('change', () => {
                this._updateRunnerHint();
                this._clearRunnerFeedback();
            });
        }

        if (customAdd) {
            customAdd.addEventListener('click', () => this.handleAddCustomSkill());
        }
    }

    render() {
        this.renderSkillList();
        this.renderCustomList();
        this.renderRunnerOptions();
        this._setRunnerEnabled(this.settings.enabled);
        this._setCustomEnabled(this.settings.customEnabled);
        this._updateRunnerHint();
        this._renderCustomTokensHint();
    }

    renderSkillList() {
        const { list } = this.elements;
        if (!list) return;

        list.innerHTML = '';
        const baseSkills = this.settings.skills.filter((skill) => !skill.isCustom);
        baseSkills.forEach((skill) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'flex-start';
            row.style.justifyContent = 'space-between';
            row.style.gap = '12px';
            row.style.padding = '8px';
            row.style.border = '1px solid rgba(0,0,0,0.06)';
            row.style.borderRadius = '8px';
            row.style.background = 'rgba(255,255,255,0.55)';

            const info = document.createElement('div');
            info.style.flex = '1';

            const title = document.createElement('div');
            title.style.fontSize = '13px';
            title.style.fontWeight = '600';
            title.textContent = `${skill.name} (${skill.id})`;

            const desc = document.createElement('div');
            desc.style.fontSize = '12px';
            desc.style.opacity = '0.8';
            desc.textContent = skill.description || '';

            const command = document.createElement('div');
            command.style.fontSize = '11px';
            command.style.opacity = '0.7';
            command.textContent = skill.command || '';

            info.appendChild(title);
            info.appendChild(desc);
            info.appendChild(command);

            const toggleLabel = document.createElement('label');
            toggleLabel.style.display = 'flex';
            toggleLabel.style.alignItems = 'center';
            toggleLabel.style.gap = '6px';

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = skill.enabled !== false;
            toggle.dataset.skillId = skill.id;
            toggle.addEventListener('change', (e) => {
                skill.enabled = e.target.checked;
            });

            const toggleText = document.createElement('span');
            toggleText.textContent = t('enabled');
            toggleText.setAttribute('data-i18n', 'enabled');

            toggleLabel.appendChild(toggle);
            toggleLabel.appendChild(toggleText);

            row.appendChild(info);
            row.appendChild(toggleLabel);
            list.appendChild(row);
        });
    }

    renderCustomList() {
        const { customList, customEmpty } = this.elements;
        if (!customList || !customEmpty) return;

        customList.innerHTML = '';
        const customSkills = this.settings.skills.filter((skill) => skill.isCustom);
        if (customSkills.length === 0) {
            customEmpty.style.display = 'block';
            return;
        }
        customEmpty.style.display = 'none';

        customSkills.forEach((skill) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'flex-start';
            row.style.justifyContent = 'space-between';
            row.style.gap = '12px';
            row.style.padding = '8px';
            row.style.border = '1px solid rgba(0,0,0,0.06)';
            row.style.borderRadius = '8px';
            row.style.background = 'rgba(255,255,255,0.5)';

            const info = document.createElement('div');
            info.style.flex = '1';

            const title = document.createElement('div');
            title.style.fontSize = '13px';
            title.style.fontWeight = '600';
            title.textContent = `${skill.name} (${skill.id})`;

            const desc = document.createElement('div');
            desc.style.fontSize = '12px';
            desc.style.opacity = '0.8';
            desc.textContent = skill.description || '';

            const command = document.createElement('div');
            command.style.fontSize = '11px';
            command.style.opacity = '0.7';
            command.textContent = skill.command || '';

            info.appendChild(title);
            info.appendChild(desc);
            info.appendChild(command);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.flexDirection = 'column';
            actions.style.alignItems = 'flex-end';
            actions.style.gap = '6px';

            const toggleLabel = document.createElement('label');
            toggleLabel.style.display = 'flex';
            toggleLabel.style.alignItems = 'center';
            toggleLabel.style.gap = '6px';

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = skill.enabled !== false;
            toggle.dataset.skillId = skill.id;
            toggle.addEventListener('change', (e) => {
                skill.enabled = e.target.checked;
            });

            const toggleText = document.createElement('span');
            toggleText.textContent = t('enabled');
            toggleText.setAttribute('data-i18n', 'enabled');

            toggleLabel.appendChild(toggle);
            toggleLabel.appendChild(toggleText);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'tool-btn';
            removeBtn.textContent = t('remove');
            removeBtn.setAttribute('data-i18n', 'remove');
            removeBtn.addEventListener('click', () => {
                this.removeCustomSkill(skill.id);
            });

            actions.appendChild(toggleLabel);
            actions.appendChild(removeBtn);

            row.appendChild(info);
            row.appendChild(actions);
            customList.appendChild(row);
        });
    }

    renderRunnerOptions() {
        const { runnerSelect } = this.elements;
        if (!runnerSelect) return;

        runnerSelect.innerHTML = '';
        this.settings.skills.forEach((skill) => {
            const option = document.createElement('option');
            option.value = skill.id;
            option.textContent = `${skill.name} (${skill.id})`;
            if (skill.isCustom && !this.settings.customEnabled) {
                option.disabled = true;
            }
            runnerSelect.appendChild(option);
        });
    }

    _setRunnerEnabled(enabled) {
        const { runnerSelect, runnerInput, runnerRun } = this.elements;
        if (runnerSelect) runnerSelect.disabled = !enabled;
        if (runnerInput) runnerInput.disabled = !enabled;
        if (runnerRun) runnerRun.disabled = !enabled;
    }

    _setCustomEnabled(enabled) {
        const { customList } = this.elements;
        const disabled = !enabled;
        if (customList) {
            customList.style.opacity = disabled ? '0.6' : '1';
        }
    }

    _updateRunnerHint() {
        const { runnerSelect, runnerInput } = this.elements;
        if (!runnerSelect || !runnerInput) return;
        const selectedId = runnerSelect.value;
        const skill = getSkillById(this.settings.skills, selectedId);
        const hint = skill && skill.inputHint ? skill.inputHint : t('skillsRunnerPlaceholder');
        runnerInput.placeholder = hint;
    }

    _clearRunnerFeedback() {
        const { runnerStatus, runnerOutput } = this.elements;
        if (runnerStatus) runnerStatus.textContent = '';
        if (runnerOutput) runnerOutput.textContent = '';
    }

    _renderCustomTokensHint() {
        const { customTokensHint } = this.elements;
        if (!customTokensHint) return;
        const tokens = this.customTokens.map((token) => `{{${token}}}`).join(', ');
        const template = t('skillsCustomTokensHint');
        customTokensHint.textContent = template.replace('{tokens}', tokens);
    }

    _setCustomMessage(message, isError = true) {
        const { customError } = this.elements;
        if (!customError) return;
        customError.textContent = message || '';
        customError.style.display = message ? 'block' : 'none';
        customError.style.color = isError ? '#b42318' : '#027a48';
    }

    _collectCustomSkillInput() {
        const {
            customId,
            customName,
            customDescription,
            customShortDescription,
            customInputHint,
            customTemplate
        } = this.elements;

        return {
            id: customId ? customId.value : '',
            name: customName ? customName.value : '',
            description: customDescription ? customDescription.value : '',
            shortDescription: customShortDescription ? customShortDescription.value : '',
            inputHint: customInputHint ? customInputHint.value : '',
            template: customTemplate ? customTemplate.value : '',
            enabled: true
        };
    }

    _resetCustomForm() {
        const {
            customId,
            customName,
            customDescription,
            customShortDescription,
            customInputHint,
            customTemplate
        } = this.elements;
        if (customId) customId.value = '';
        if (customName) customName.value = '';
        if (customDescription) customDescription.value = '';
        if (customShortDescription) customShortDescription.value = '';
        if (customInputHint) customInputHint.value = '';
        if (customTemplate) customTemplate.value = '';
    }

    _formatValidationErrors(errors) {
        if (!Array.isArray(errors) || errors.length === 0) return '';
        const map = {
            id_required: t('skillsValidationIdRequired'),
            id_invalid: t('skillsValidationIdInvalid'),
            id_reserved: t('skillsValidationIdReserved'),
            id_duplicate: t('skillsValidationIdDuplicate'),
            name_required: t('skillsValidationNameRequired'),
            template_required: t('skillsValidationTemplateRequired'),
            template_too_long: t('skillsValidationTemplateTooLong')
        };
        return errors.map((key) => map[key] || key).join(' ');
    }

    handleAddCustomSkill() {
        const existingIds = new Set(this.settings.skills.map((skill) => skill.id));
        if (this.settings.skills.filter((skill) => skill.isCustom).length >= this.customLimits.maxCustomSkills) {
            this._setCustomMessage(t('skillsValidationLimitReached'), true);
            return;
        }

        const payload = this._collectCustomSkillInput();
        const baseIds = new Set(this.settings.skills.filter((skill) => !skill.isCustom).map((skill) => skill.id));
        const result = validateCustomSkill(payload, { reservedIds: baseIds, existingIds });

        if (!result.valid) {
            this._setCustomMessage(this._formatValidationErrors(result.errors), true);
            return;
        }

        this.settings.skills.push(result.skill);
        this.renderCustomList();
        this.renderRunnerOptions();
        this._resetCustomForm();
        this._setCustomMessage(t('skillsCustomAdded'), false);
        this._updateRunnerHint();
    }

    removeCustomSkill(skillId) {
        this.settings.skills = this.settings.skills.filter((skill) => skill.id !== skillId);
        this.renderCustomList();
        this.renderRunnerOptions();
        this._updateRunnerHint();
        this._setCustomMessage('', true);
    }

    async handleRun() {
        const { runnerSelect, runnerInput, runnerStatus, runnerOutput } = this.elements;
        if (!runnerSelect || !runnerStatus || !runnerOutput) return;

        this._clearRunnerFeedback();

        if (!this.settings.enabled) {
            runnerStatus.textContent = t('skillsRunnerDisabled');
            return;
        }

        const skillId = runnerSelect.value;
        const skill = getSkillById(this.settings.skills, skillId);
        if (!skill) {
            runnerStatus.textContent = t('skillsRunnerNotFound');
            return;
        }

        if (skill.isCustom && !this.settings.customEnabled) {
            runnerStatus.textContent = t('skillsCustomDisabled');
            return;
        }

        const input = runnerInput ? runnerInput.value : '';

        try {
            const output = await executeSkill(skill, input);
            runnerOutput.textContent = output;
            runnerStatus.textContent = t('skillsRunnerDone');
        } catch (err) {
            const message = err && err.message ? err.message : t('skillsRunnerError');
            runnerStatus.textContent = message;
        }
    }

    setData(data) {
        this.settings = normalizeSkillsSettings(data || {});
        if (this.elements.enabledToggle) {
            this.elements.enabledToggle.checked = this.settings.enabled;
        }
        if (this.elements.customEnabledToggle) {
            this.elements.customEnabledToggle.checked = this.settings.customEnabled;
        }
        this.render();
    }

    getData() {
        const enabled = this.elements.enabledToggle ? this.elements.enabledToggle.checked : this.settings.enabled;
        const customEnabled = this.elements.customEnabledToggle ? this.elements.customEnabledToggle.checked : this.settings.customEnabled;
        const baseSkills = this.settings.skills
            .filter((skill) => !skill.isCustom)
            .map((skill) => ({
                id: skill.id,
                enabled: skill.enabled !== false
            }));

        const customSkills = this.settings.skills
            .filter((skill) => skill.isCustom)
            .map((skill) => ({
                id: skill.id,
                name: skill.name,
                description: skill.description,
                shortDescription: skill.shortDescription,
                inputHint: skill.inputHint,
                template: skill.template,
                enabled: skill.enabled !== false
            }));

        return {
            enabled,
            customEnabled,
            skills: baseSkills,
            customSkills
        };
    }
}
