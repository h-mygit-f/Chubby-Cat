// sandbox/ui/settings/sections/skills.js
import { normalizeSkillsSettings, executeSkill, getSkillById } from '../../../../lib/skills/index.js';
import { t } from '../../../core/i18n.js';

export class SkillsSection {
    constructor() {
        this.elements = {};
        this.settings = normalizeSkillsSettings();
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
            runnerOutput: get('skills-runner-output')
        };
    }

    bindEvents() {
        const { enabledToggle, runnerRun } = this.elements;

        if (enabledToggle) {
            enabledToggle.addEventListener('change', (e) => {
                this.settings.enabled = e.target.checked;
                this._setRunnerEnabled(this.settings.enabled);
            });
        }

        if (runnerRun) {
            runnerRun.addEventListener('click', () => this.handleRun());
        }
    }

    render() {
        this.renderSkillList();
        this.renderRunnerOptions();
        this._setRunnerEnabled(this.settings.enabled);
    }

    renderSkillList() {
        const { list } = this.elements;
        if (!list) return;

        list.innerHTML = '';
        this.settings.skills.forEach((skill) => {
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

    renderRunnerOptions() {
        const { runnerSelect } = this.elements;
        if (!runnerSelect) return;

        runnerSelect.innerHTML = '';
        this.settings.skills.forEach((skill) => {
            const option = document.createElement('option');
            option.value = skill.id;
            option.textContent = `${skill.name} (${skill.id})`;
            runnerSelect.appendChild(option);
        });
    }

    _setRunnerEnabled(enabled) {
        const { runnerSelect, runnerInput, runnerRun } = this.elements;
        if (runnerSelect) runnerSelect.disabled = !enabled;
        if (runnerInput) runnerInput.disabled = !enabled;
        if (runnerRun) runnerRun.disabled = !enabled;
    }

    async handleRun() {
        const { runnerSelect, runnerInput, runnerStatus, runnerOutput } = this.elements;
        if (!runnerSelect || !runnerStatus || !runnerOutput) return;

        runnerStatus.textContent = '';
        runnerOutput.textContent = '';

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

        const input = runnerInput ? runnerInput.value : '';

        try {
            const output = await executeSkill(skill.id, input);
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
        this.render();
    }

    getData() {
        const enabled = this.elements.enabledToggle ? this.elements.enabledToggle.checked : this.settings.enabled;
        const skills = this.settings.skills.map((skill) => ({
            id: skill.id,
            enabled: skill.enabled !== false
        }));

        return { enabled, skills };
    }
}
