// lib/skills/index.js

const BASE_SKILLS = [
    {
        id: 'timestamp',
        name: 'Timestamp',
        description: 'Generate the current ISO timestamp.',
        command: '/skill timestamp',
        inputHint: '',
        enabledByDefault: true
    },
    {
        id: 'word_count',
        name: 'Word Count',
        description: 'Count words, characters, and lines from input text.',
        command: '/skill word_count <text>',
        inputHint: 'Paste text to analyze',
        enabledByDefault: true
    },
    {
        id: 'json_prettify',
        name: 'JSON Prettify',
        description: 'Format JSON input into pretty-printed output.',
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

export function normalizeSkillsSettings(saved = {}) {
    const enabled = saved.enabled !== false;
    const savedSkills = Array.isArray(saved.skills) ? saved.skills : [];
    const enabledMap = new Map(
        savedSkills
            .filter((s) => s && typeof s.id === 'string')
            .map((s) => [s.id, s.enabled !== false])
    );

    const skills = BASE_SKILLS.map((skill) => ({
        ...skill,
        enabled: enabledMap.has(skill.id) ? enabledMap.get(skill.id) : skill.enabledByDefault !== false
    }));

    return { enabled, skills };
}

export function serializeSkillsSettings(settings = {}) {
    const enabled = settings.enabled !== false;
    const skills = Array.isArray(settings.skills)
        ? settings.skills.map((skill) => ({
            id: skill.id,
            enabled: skill.enabled !== false
        }))
        : [];

    return { enabled, skills };
}

export function getSkillById(skills, id) {
    if (!Array.isArray(skills) || !id) return null;
    return skills.find((skill) => skill.id === id) || null;
}

export async function executeSkill(id, input, context = {}) {
    const executor = SKILL_EXECUTORS[id];
    if (!executor) {
        throw new Error(`Unknown skill: ${id}`);
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
