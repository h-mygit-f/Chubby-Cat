/**
 * Unit Tests for Custom Skills
 *
 * Run in browser console with the extension loaded:
 * const script = document.createElement('script');
 * script.src = chrome.runtime.getURL('tests/skills_custom.test.js');
 * document.head.appendChild(script);
 * runSkillsCustomTests();
 */

const resolveModuleUrl = (path) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        return chrome.runtime.getURL(path);
    }
    return path;
};

const loadSkillsModule = async () => {
    const url = resolveModuleUrl('lib/skills/index.js');
    return import(url);
};

async function testNormalizeCustomSkill() {
    const { normalizeSkillsSettings } = await loadSkillsModule();
    const settings = normalizeSkillsSettings({
        customEnabled: true,
        customSkills: [
            {
                id: 'note_skill',
                name: 'Note Skill',
                description: 'Adds a note template',
                template: 'Note: {{input}}'
            }
        ]
    });

    const customSkill = settings.skills.find((skill) => skill.id === 'note_skill');
    const pass = Boolean(customSkill)
        && settings.customEnabled === true
        && customSkill.isCustom === true
        && customSkill.command === '/skill note_skill';

    console.log(pass ? '✅ PASS: normalizeSkillsSettings merges custom skills' : '❌ FAIL: custom skills missing from normalized settings');
    return pass;
}

async function testExecuteTemplateSkill() {
    const { executeSkill } = await loadSkillsModule();
    const skill = {
        id: 'echo_custom',
        name: 'Echo',
        template: 'Echo: {{input}} ({{sessionId}})',
        type: 'template'
    };
    const output = await executeSkill(skill, 'hello', { sessionId: 'session-1' });
    const pass = output === 'Echo: hello (session-1)';
    console.log(pass ? '✅ PASS: template skill execution renders tokens' : '❌ FAIL: template skill execution did not match expected output');
    return pass;
}

async function testSerializeRoundTrip() {
    const { normalizeSkillsSettings, serializeSkillsSettings } = await loadSkillsModule();
    const settings = normalizeSkillsSettings({
        customEnabled: true,
        customSkills: [
            {
                id: 'wrap_it',
                name: 'Wrap It',
                shortDescription: 'Wrap input',
                template: '[[{{input}}]]',
                enabled: false
            }
        ]
    });

    const serialized = serializeSkillsSettings(settings);
    const customSkill = serialized.customSkills && serialized.customSkills[0];
    const hasBaseSkill = Array.isArray(serialized.skills) && serialized.skills.some((skill) => skill.id === 'timestamp');
    const pass = serialized.customEnabled === true
        && hasBaseSkill
        && customSkill
        && customSkill.id === 'wrap_it'
        && customSkill.enabled === false
        && customSkill.template === '[[{{input}}]]';

    console.log(pass ? '✅ PASS: serializeSkillsSettings persists custom skills' : '❌ FAIL: serializeSkillsSettings output mismatch');
    return pass;
}

async function testValidateCustomSkill() {
    const { validateCustomSkill } = await loadSkillsModule();
    const result = validateCustomSkill({ id: 'Bad-ID', name: '', template: '' }, {
        reservedIds: new Set(['timestamp']),
        existingIds: new Set(['note_skill'])
    });
    const pass = result.valid === false
        && result.errors.includes('id_invalid')
        && result.errors.includes('name_required')
        && result.errors.includes('template_required');

    console.log(pass ? '✅ PASS: validateCustomSkill flags invalid input' : '❌ FAIL: validateCustomSkill did not return expected errors');
    return pass;
}

async function runSkillsCustomTests() {
    console.log('=== Custom Skills Unit Tests ===\n');

    const results = [];
    results.push(await testNormalizeCustomSkill());
    results.push(await testExecuteTemplateSkill());
    results.push(await testSerializeRoundTrip());
    results.push(await testValidateCustomSkill());

    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} tests passed`);
    return passed === results.length;
}

if (typeof window !== 'undefined') {
    console.log('Run runSkillsCustomTests() to execute tests');
}
