// sandbox/ui/templates/settings/skills.js

export const SkillsSettingsTemplate = `
<div class="setting-group">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <div>
            <label data-i18n="skillsTitle" style="font-weight: 500; display: block; margin-bottom: 2px;">Skills</label>
            <div data-i18n="skillsDesc" style="font-size: 12px; opacity: 0.85;">Reusable agent capabilities with scripts and instructions.</div>
        </div>
        <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="skills-enabled" />
            <span data-i18n="enabled">Enabled</span>
        </label>
    </div>

    <div id="skills-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
    <div data-i18n="skillsCommandHint" style="font-size: 11px; opacity: 0.7; margin-top: 8px;">
        Use /skill &lt;id&gt; &lt;input&gt; in chat to execute a skill.
    </div>
</div>

<div class="setting-group">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <div>
            <label data-i18n="skillsCustomTitle" style="font-weight: 500; display: block; margin-bottom: 2px;">Custom Skills</label>
            <div data-i18n="skillsCustomDesc" style="font-size: 12px; opacity: 0.85;">Create reusable skills with safe templates.</div>
        </div>
        <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="skills-custom-enabled" />
            <span data-i18n="skillsCustomEnabled">Enable custom skills</span>
        </label>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.5); border: 1px dashed rgba(0,0,0,0.08);">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <input id="skills-custom-id" class="shortcut-input" style="flex: 1; min-width: 140px;" maxlength="40"
                data-i18n-placeholder="skillsCustomIdPlaceholder" placeholder="skill_id">
            <input id="skills-custom-name" class="shortcut-input" style="flex: 1; min-width: 160px;" maxlength="60"
                data-i18n-placeholder="skillsCustomNamePlaceholder" placeholder="Skill name">
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <input id="skills-custom-short-desc" class="shortcut-input" style="flex: 1; min-width: 180px;" maxlength="80"
                data-i18n-placeholder="skillsCustomShortDescPlaceholder" placeholder="Short description">
            <input id="skills-custom-input-hint" class="shortcut-input" style="flex: 1; min-width: 180px;" maxlength="120"
                data-i18n-placeholder="skillsCustomInputHintPlaceholder" placeholder="Input hint">
        </div>
        <input id="skills-custom-description" class="shortcut-input" style="width: 100%;" maxlength="200"
            data-i18n-placeholder="skillsCustomDescPlaceholder" placeholder="Description">
        <textarea id="skills-custom-template" class="shortcut-input" rows="4" style="width: 100%; resize: vertical;" maxlength="2000"
            data-i18n-placeholder="skillsCustomTemplatePlaceholder" placeholder="Template"></textarea>
        <div id="skills-custom-tokens" data-i18n="skillsCustomTokensHint" style="font-size: 11px; opacity: 0.7;">Available tokens: {tokens}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <button id="skills-custom-add" class="tool-btn" type="button" data-i18n="skillsCustomAdd">Add skill</button>
            <span id="skills-custom-error" style="font-size: 12px; color: #b42318; display: none;"></span>
        </div>
    </div>

    <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 10px;">
        <div id="skills-custom-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
        <div id="skills-custom-empty" data-i18n="skillsCustomEmpty" style="font-size: 12px; opacity: 0.7;">No custom skills yet.</div>
    </div>
</div>

<div class="setting-group">
    <h4 data-i18n="skillsRunnerTitle">Skill Runner</h4>
    <p class="setting-desc" data-i18n="skillsRunnerDesc">Test a skill with sample input.</p>
    <div style="display: flex; flex-direction: column; gap: 8px;">
        <select id="skills-runner-select" class="shortcut-input" style="width: 100%; text-align: left; padding: 6px 12px;"></select>
        <input id="skills-runner-input" class="shortcut-input" style="width: 100%; text-align: left; box-sizing: border-box;"
            data-i18n-placeholder="skillsRunnerPlaceholder" placeholder="Enter input for the skill">
        <div style="display: flex; gap: 8px; align-items: center;">
            <button id="skills-runner-run" class="tool-btn" style="padding: 6px 10px;" type="button" data-i18n="skillsRunnerRun">Run</button>
            <span id="skills-runner-status" style="font-size: 12px; opacity: 0.8;"></span>
        </div>
        <pre id="skills-runner-output" style="white-space: pre-wrap; font-size: 12px; margin: 0; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.55); border: 1px solid rgba(0,0,0,0.06); max-height: 180px; overflow: auto;"></pre>
    </div>
</div>
`;
