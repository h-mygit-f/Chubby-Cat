/**
 * Integration Tests for Custom Skills
 *
 * Run in browser developer console with the extension loaded:
 * const script = document.createElement('script');
 * script.src = chrome.runtime.getURL('tests/skills_integration.test.js');
 * document.head.appendChild(script);
 * runSkillsIntegrationTests();
 */

async function runSkillsIntegrationTests() {
    console.log('=== Integration Test: Custom Skills ===\n');

    const customId = document.getElementById('skills-custom-id');
    const customTemplate = document.getElementById('skills-custom-template');
    const customAdd = document.getElementById('skills-custom-add');
    const customEnabled = document.getElementById('skills-custom-enabled');
    const skillsButton = document.getElementById('skills-btn');

    if (!customId || !customTemplate || !customAdd || !customEnabled) {
        console.log('❌ Custom skills UI not found. Open Settings → Skills panel and re-run.');
        return false;
    }

    console.log('✅ Custom skills UI elements detected');
    if (skillsButton) {
        console.log('✅ Skills dropdown button detected');
    }

    console.log('\n--- Manual Test Steps ---');
    console.log('1. Toggle "Enable custom skills" ON.');
    console.log('2. Add a skill with:');
    console.log('   - ID: echo_skill');
    console.log('   - Name: Echo Skill');
    console.log('   - Template: Echo: {{input}}');
    console.log('3. Click "Add skill" and then Save settings.');
    console.log('4. In chat, run: /skill echo_skill hello');
    console.log('   - Expect tool output: "Echo: hello"');
    console.log('5. Disable custom skills and re-run /skill echo_skill hello');
    console.log('   - Expect status message: "Custom skills are disabled"');
    console.log('6. Re-open Settings and confirm the custom skill persists.');
    console.log('7. Reload the extension and verify the custom skill remains.');

    return true;
}

if (typeof window !== 'undefined') {
    console.log('Run runSkillsIntegrationTests() to execute tests');
}
