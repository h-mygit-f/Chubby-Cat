/**
 * Integration Tests for Bug Fixes
 * 
 * These tests verify the complete user flow for:
 * 1. Multi-tab content preservation
 * 2. User input preservation
 * 
 * Run in browser developer console with the extension loaded
 */

/**
 * Helper to wait for a condition
 */
const waitFor = (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
            if (condition()) {
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
};

/**
 * Integration Test: Complete multi-tab context flow
 * 
 * Prerequisites:
 * - Extension sidebar is open
 * - Multiple tabs are available
 */
async function integrationTestMultiTabFlow() {
    console.log('=== Integration Test: Multi-Tab Context Flow ===\n');

    try {
        // 1. Verify ActiveTabController exists
        const activeTabContainer = document.getElementById('active-tab-container');
        if (!activeTabContainer) {
            console.log('❌ Active tab container not found. Is the sidebar open?');
            return false;
        }
        console.log('✅ Active tab container found');

        // 2. Check if multi-tab dropdown can be opened
        const activeTabDisplay = document.getElementById('active-tab-display');
        if (activeTabDisplay) {
            console.log('✅ Active tab display element found');
            console.log('   Click the tab display to open multi-tab selector');
        }

        // 3. Check input field
        const inputField = document.getElementById('prompt');
        if (inputField) {
            console.log('✅ Input field found');
            console.log(`   Current value: "${inputField.value}"`);
        }

        // 4. Check model selector
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            console.log('✅ Model selector found');
            console.log(`   Current model: "${modelSelect.value}"`);
        }

        console.log('\n--- Manual Test Steps ---');
        console.log('1. Select multiple tabs from the tab dropdown');
        console.log('2. Send a message');
        console.log('3. Send another message - verify multi-tab context still works');
        console.log('4. Switch to a different model');
        console.log('5. Send another message - verify multi-tab context still works');
        console.log('6. Type something but don\'t send');
        console.log('7. Click "New Chat" - verify input is NOT cleared');

        return true;
    } catch (e) {
        console.error('Integration test error:', e);
        return false;
    }
}

/**
 * Integration Test: Input preservation flow
 */
async function integrationTestInputPreservation() {
    console.log('=== Integration Test: Input Preservation ===\n');

    try {
        const inputField = document.getElementById('prompt');
        if (!inputField) {
            console.log('❌ Input field not found. Is the sidebar open?');
            return false;
        }

        // Store current value
        const originalValue = inputField.value;

        // Set test value
        inputField.value = 'Test input for preservation check';
        inputField.dispatchEvent(new Event('input'));

        console.log('✅ Set test input value');
        console.log('\n--- Manual Test Steps ---');
        console.log('1. Click "New Chat" button');
        console.log('2. Verify the input field still contains: "Test input for preservation check"');
        console.log('3. If preserved, the fix is working correctly');

        return true;
    } catch (e) {
        console.error('Integration test error:', e);
        return false;
    }
}

/**
 * Check chrome.storage.session for multi-tab context
 */
async function checkMultiTabStorage() {
    console.log('=== Checking Multi-Tab Context Storage ===\n');

    try {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.session) {
            console.log('⚠️ chrome.storage.session not available');
            console.log('   This check needs to run in the extension context');
            return false;
        }

        const stored = await chrome.storage.session.get(['multiTabContext', 'multiTabCount']);

        if (stored.multiTabContext) {
            console.log('✅ Multi-tab context found in storage:');
            console.log(`   Tab count: ${stored.multiTabCount}`);
            console.log(`   Content length: ${stored.multiTabContext.length} chars`);
            console.log(`   Preview: ${stored.multiTabContext.substring(0, 200)}...`);
        } else {
            console.log('ℹ️ No multi-tab context in storage');
            console.log('   Select tabs to import content first');
        }

        return true;
    } catch (e) {
        console.error('Storage check error:', e);
        return false;
    }
}

/**
 * Run all integration tests
 */
async function runIntegrationTests() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   Bug Fix Integration Tests                ║');
    console.log('╚════════════════════════════════════════════╝\n');

    await integrationTestMultiTabFlow();
    console.log('\n');
    await integrationTestInputPreservation();
    console.log('\n');
    await checkMultiTabStorage();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   Tests Complete                           ║');
    console.log('║   Follow manual steps above to verify      ║');
    console.log('╚════════════════════════════════════════════╝');
}

// Instructions
console.log('=== Integration Tests ===');
console.log('Available functions:');
console.log('  runIntegrationTests()     - Run all integration tests');
console.log('  checkMultiTabStorage()    - Check multi-tab context storage');
console.log('');
console.log('Open the extension sidebar first, then run the tests.');
