// sandbox/skills/manager.js
import { normalizeSkillsSettings, executeSkill, getSkillById } from '../../lib/skills/index.js';
import { TOOL_OUTPUT_PREFIX } from '../../lib/constants.js';

export class SkillsManager {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;
        this.settings = normalizeSkillsSettings();
    }

    updateSettings(settings) {
        this.settings = normalizeSkillsSettings(settings);
    }

    getSettings() {
        return this.settings;
    }

    parseInvocation(text) {
        if (!text || typeof text !== 'string') return null;
        const match = text.match(/^\/skill\s+([^\s]+)(?:\s+([\s\S]*))?$/i);
        if (!match) return null;
        return {
            id: match[1].trim(),
            input: (match[2] || '').trim(),
            raw: text
        };
    }

    formatToolOutput(skill, output) {
        return `${TOOL_OUTPUT_PREFIX}\n[Skill: ${skill.name} (${skill.id})]\n\`\`\`\n${output}\n\`\`\``;
    }

    buildPromptText(originalText, invocation, skill, output) {
        const skillBlock = `[Skill Output: ${skill.name} (${skill.id})]\n\`\`\`\n${output}\n\`\`\``;
        const inputText = invocation && invocation.input ? invocation.input.trim() : '';
        const inputBlock = inputText ? `Input:\n${inputText}\n\n` : '';
        return `${inputBlock}${skillBlock}\n\n(Use the skill output above to respond.)`;
    }

    async executeFromText(text, context = {}) {
        const invocation = this.parseInvocation(text);
        if (!invocation) return { handled: false };

        if (!this.settings.enabled) {
            return { handled: true, error: 'skills_disabled', invocation };
        }

        const skill = getSkillById(this.settings.skills, invocation.id);
        if (!skill) {
            return { handled: true, error: 'skill_not_found', invocation };
        }

        if (!skill.enabled) {
            return { handled: true, error: 'skill_disabled', invocation, skill };
        }

        try {
            const output = await executeSkill(skill.id, invocation.input, context);
            return { handled: true, skill, invocation, output };
        } catch (err) {
            this.logger.error('[Chubby Cat] Skill execution failed', err);
            return { handled: true, error: 'skill_error', invocation, skill, details: err };
        }
    }
}
