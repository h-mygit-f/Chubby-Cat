// lib/skills/index.js

const BASE_SKILLS = [
    {
        id: 'timestamp',
        name: 'Timestamp',
        description: 'Generate the current ISO timestamp.',
        shortDescription: 'Current timestamp',
        command: '/skill timestamp',
        inputHint: '',
        enabledByDefault: true
    },
    {
        id: 'word_count',
        name: 'Word Count',
        description: 'Count words, characters, and lines from input text.',
        shortDescription: 'Word count stats',
        command: '/skill word_count <text>',
        inputHint: 'Paste text to analyze',
        enabledByDefault: true
    },
    {
        id: 'json_prettify',
        name: 'JSON Prettify',
        description: 'Format JSON input into pretty-printed output.',
        shortDescription: 'Format JSON',
        command: '/skill json_prettify <json>',
        inputHint: 'Paste JSON to format',
        enabledByDefault: true
    }
];

const SKILL_EXECUTORS = {
    timestamp: async () => {
        return new Date().toISOString();
    },
    word_count: async ({ input }) => {
        const raw = typeof input === 'string' ? input : '';
        const trimmed = raw.trim();
        const words = trimmed ? trimmed.split(/\s+/).length : 0;
        const chars = raw.length;
        const lines = raw ? raw.split(/\r?\n/).length : 0;
        return `Words: ${words}\nCharacters: ${chars}\nLines: ${lines}`;
    },
    json_prettify: async ({ input }) => {
        const raw = typeof input === 'string' ? input.trim() : '';
        if (!raw) {
            throw new Error('Input is empty');
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            throw new Error('Invalid JSON');
        }
        return JSON.stringify(parsed, null, 2);
    }
};

const CUSTOM_SKILL_ID_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;
const CUSTOM_SKILL_LIMITS = {
    nameMax: 60,
    descriptionMax: 200,
    shortDescriptionMax: 80,
    inputHintMax: 120,
    templateMax: 2000,
    maxCustomSkills: 25
};
const CUSTOM_SKILL_TOKENS = ['input', 'timestamp', 'date', 'time', 'sessionId'];

const sanitizeText = (value, limit) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (trimmed.length > limit) {
        return trimmed.slice(0, limit);
    }
    return trimmed;
};

const normalizeCustomSkill = (raw = {}, options = {}) => {
    const errors = [];
    const reservedIds = options.reservedIds || new Set();
    const existingIds = options.existingIds || new Set();
    const seenIds = options.seenIds || new Set();
    const allowDuplicate = options.allowDuplicate === true;

    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id) {
        errors.push('id_required');
    } else if (!CUSTOM_SKILL_ID_PATTERN.test(id)) {
        errors.push('id_invalid');
    } else if (reservedIds.has(id)) {
        errors.push('id_reserved');
    } else if (!allowDuplicate && (existingIds.has(id) || seenIds.has(id))) {
        errors.push('id_duplicate');
    }

    const name = sanitizeText(raw.name, CUSTOM_SKILL_LIMITS.nameMax);
    if (!name) errors.push('name_required');

    const description = sanitizeText(raw.description, CUSTOM_SKILL_LIMITS.descriptionMax);
    const shortDescription = sanitizeText(raw.shortDescription, CUSTOM_SKILL_LIMITS.shortDescriptionMax);
    const inputHint = sanitizeText(raw.inputHint, CUSTOM_SKILL_LIMITS.inputHintMax);

    const template = typeof raw.template === 'string' ? raw.template.trim() : '';
    if (!template) {
        errors.push('template_required');
    } else if (template.length > CUSTOM_SKILL_LIMITS.templateMax) {
        errors.push('template_too_long');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    const normalized = {
        id,
        name,
        description,
        shortDescription,
        inputHint,
        template,
        type: 'template',
        enabled: raw.enabled !== false,
        isCustom: true,
        command: `/skill ${id}`
    };

    return { valid: true, errors, skill: normalized };
};

const normalizeCustomSkills = (skills, options = {}) => {
    const list = Array.isArray(skills) ? skills : [];
    const normalized = [];
    const seenIds = new Set();
    const reservedIds = options.reservedIds || new Set();

    for (const raw of list) {
        if (normalized.length >= CUSTOM_SKILL_LIMITS.maxCustomSkills) {
            break;
        }
        const result = normalizeCustomSkill(raw, {
            reservedIds,
            existingIds: options.existingIds,
            seenIds
        });
        if (result.valid) {
            normalized.push(result.skill);
            seenIds.add(result.skill.id);
        }
    }

    return normalized;
};

export function validateCustomSkill(raw = {}, options = {}) {
    return normalizeCustomSkill(raw, {
        ...options,
        existingIds: options.existingIds
    });
}

export function normalizeSkillsSettings(saved = {}) {
    const enabled = saved.enabled !== false;
    const customEnabled = saved.customEnabled === true;
    const savedSkills = Array.isArray(saved.skills) ? saved.skills : [];
    const enabledMap = new Map(
        savedSkills
            .filter((s) => s && typeof s.id === 'string')
            .map((s) => [s.id, s.enabled !== false])
    );

    const baseSkills = BASE_SKILLS.map((skill) => ({
        ...skill,
        enabled: enabledMap.has(skill.id) ? enabledMap.get(skill.id) : skill.enabledByDefault !== false
    }));

    const reservedIds = new Set(baseSkills.map((skill) => skill.id));
    const customSeed = Array.isArray(saved.customSkills)
        ? saved.customSkills
        : savedSkills.filter((skill) => skill && (skill.isCustom || typeof skill.template === 'string'));
    const customSkills = normalizeCustomSkills(customSeed, { reservedIds });

    const skills = [...baseSkills, ...customSkills];

    return { enabled, customEnabled, skills };
}

export function serializeSkillsSettings(settings = {}) {
    const enabled = settings.enabled !== false;
    const customEnabled = settings.customEnabled === true;
    const skillsInput = Array.isArray(settings.skills) ? settings.skills : [];
    const customSkillsInput = Array.isArray(settings.customSkills) ? settings.customSkills : null;
    const baseIds = new Set(BASE_SKILLS.map((skill) => skill.id));

    const skills = skillsInput
        .filter((skill) => skill && baseIds.has(skill.id))
        .map((skill) => ({
            id: skill.id,
            enabled: skill.enabled !== false
        }));

    const derivedCustomSkills = customSkillsInput
        || skillsInput.filter((skill) => skill && !baseIds.has(skill.id));

    const customSkills = normalizeCustomSkills(derivedCustomSkills, { reservedIds: baseIds })
        .map((skill) => ({
            id: skill.id,
            name: skill.name,
            description: skill.description,
            shortDescription: skill.shortDescription,
            inputHint: skill.inputHint,
            template: skill.template,
            enabled: skill.enabled !== false
        }));

    return { enabled, customEnabled, skills, customSkills };
}

export function getSkillById(skills, id) {
    if (!Array.isArray(skills) || !id) return null;
    return skills.find((skill) => skill.id === id) || null;
}

const renderTemplateSkill = (skill, input, context = {}) => {
    const source = typeof skill.template === 'string' ? skill.template : '';
    if (!source) return '';
    const now = new Date();
    const replacements = {
        input: typeof input === 'string' ? input : '',
        timestamp: now.toISOString(),
        date: now.toISOString().slice(0, 10),
        time: now.toISOString().slice(11, 19),
        sessionId: context && context.sessionId ? String(context.sessionId) : ''
    };

    return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, token) => {
        if (!Object.prototype.hasOwnProperty.call(replacements, token)) {
            return match;
        }
        return replacements[token];
    });
};

export async function executeSkill(skillOrId, input, context = {}) {
    const skill = typeof skillOrId === 'object' && skillOrId !== null ? skillOrId : null;
    const id = typeof skillOrId === 'string' ? skillOrId : skill && skill.id;

    if (skill && skill.type === 'template') {
        const output = renderTemplateSkill(skill, input, context);
        return output;
    }

    const executor = SKILL_EXECUTORS[id];
    if (!executor) {
        throw new Error(`Unknown skill: ${id || 'unknown'}`);
    }
    const output = await executor({ input, context });
    if (typeof output !== 'string') {
        return JSON.stringify(output, null, 2);
    }
    return output;
}

export function getBaseSkills() {
    return BASE_SKILLS.map((skill) => ({ ...skill }));
}

export function getCustomSkillTokens() {
    return [...CUSTOM_SKILL_TOKENS];
}

export function getCustomSkillLimits() {
    return { ...CUSTOM_SKILL_LIMITS };
}
