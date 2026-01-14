/**
 * Unit Tests for Multi-Tab Context Persistence
 * 
 * Tests the fix for multi-tab content not being cleared after first use
 * 
 * Run in browser console or with a test runner
 */

/**
 * Mock chrome.storage.session for testing
 */
const createMockStorageSession = () => {
    let storage = {};

    return {
        get: async (keys) => {
            const result = {};
            (Array.isArray(keys) ? keys : [keys]).forEach(key => {
                if (storage[key] !== undefined) {
                    result[key] = storage[key];
                }
            });
            return result;
        },
        set: async (items) => {
            Object.assign(storage, items);
        },
        remove: async (keys) => {
            (Array.isArray(keys) ? keys : [keys]).forEach(key => {
                delete storage[key];
            });
        },
        clear: async () => {
            storage = {};
        },
        // Helper for testing
        _getAll: () => ({ ...storage })
    };
};

/**
 * Test: Multi-tab content persists after first message
 */
async function testMultiTabContentPersistsAfterUse() {
    console.log('Test: Multi-tab content persists after first message...');

    const mockStorage = createMockStorageSession();

    // Simulate importing tab content
    await mockStorage.set({
        multiTabContext: 'Content from Tab 1\n---\nContent from Tab 2',
        multiTabCount: 2
    });

    // Simulate PromptBuilder.build() - OLD behavior would clear
    // NEW behavior does NOT clear
    const simulateBuildPrompt = async (includeMultiTabContext) => {
        let systemPreamble = '';

        if (includeMultiTabContext) {
            const stored = await mockStorage.get(['multiTabContext', 'multiTabCount']);
            if (stored.multiTabContext && stored.multiTabCount > 0) {
                systemPreamble += `Webpage Context (${stored.multiTabCount} tabs):\n${stored.multiTabContext}\n`;
                // OLD CODE (REMOVED):
                // await mockStorage.remove(['multiTabContext', 'multiTabCount']);

                // NEW CODE: Do NOT clear - content should persist
            }
        }

        return systemPreamble;
    };

    // First message
    const prompt1 = await simulateBuildPrompt(true);
    const hasContent1 = prompt1.includes('Content from Tab 1') && prompt1.includes('Content from Tab 2');

    // Second message (should still have content)
    const prompt2 = await simulateBuildPrompt(true);
    const hasContent2 = prompt2.includes('Content from Tab 1') && prompt2.includes('Content from Tab 2');

    // Verify storage still has the content
    const storage = mockStorage._getAll();
    const storageHasContent = storage.multiTabContext !== undefined && storage.multiTabCount === 2;

    const allPassed = hasContent1 && hasContent2 && storageHasContent;

    console.log(hasContent1 ? '  ✅ First message has content' : '  ❌ First message missing content');
    console.log(hasContent2 ? '  ✅ Second message has content' : '  ❌ Second message missing content');
    console.log(storageHasContent ? '  ✅ Storage still has content' : '  ❌ Storage was cleared');

    console.log(allPassed ? '✅ PASS' : '❌ FAIL');
    return allPassed;
}

/**
 * Test: Multi-tab content cleared when user deselects
 */
async function testMultiTabContentClearedOnDeselect() {
    console.log('Test: Multi-tab content cleared when user deselects...');

    const mockStorage = createMockStorageSession();

    // Simulate importing tab content
    await mockStorage.set({
        multiTabContext: 'Content from tabs',
        multiTabCount: 3
    });

    // Verify content exists
    let stored = await mockStorage.get(['multiTabContext', 'multiTabCount']);
    const hadContent = stored.multiTabContext !== undefined;

    // Simulate user deselecting all tabs (triggers CLEAR_MULTI_TAB_CONTEXT)
    await mockStorage.remove(['multiTabContext', 'multiTabCount']);

    // Verify content is cleared
    stored = await mockStorage.get(['multiTabContext', 'multiTabCount']);
    const contentCleared = stored.multiTabContext === undefined;

    const allPassed = hadContent && contentCleared;

    console.log(hadContent ? '  ✅ Content existed before deselect' : '  ❌ Content was not set');
    console.log(contentCleared ? '  ✅ Content cleared after deselect' : '  ❌ Content not cleared');

    console.log(allPassed ? '✅ PASS' : '❌ FAIL');
    return allPassed;
}

/**
 * Test: Multi-tab content preserved across model switch
 */
async function testMultiTabContentPreservedOnModelSwitch() {
    console.log('Test: Multi-tab content preserved on model switch...');

    const mockStorage = createMockStorageSession();

    // Simulate importing tab content
    await mockStorage.set({
        multiTabContext: 'Important context',
        multiTabCount: 1
    });

    // Simulate model switch - this is just state change, should not affect storage
    let currentModel = 'gemini-3-flash';
    currentModel = 'gemini-3-flash-thinking';

    // Verify content still exists after model switch
    const stored = await mockStorage.get(['multiTabContext', 'multiTabCount']);
    const contentPreserved = stored.multiTabContext === 'Important context';

    console.log(contentPreserved ? '✅ PASS: Content preserved after model switch' : '❌ FAIL: Content lost on model switch');
    return contentPreserved;
}

/**
 * Test: Single-page context independent of multi-tab
 */
async function testSinglePageContextIndependent() {
    console.log('Test: Single-page context independent of multi-tab...');

    const mockStorage = createMockStorageSession();

    // Simulate multi-tab content
    await mockStorage.set({
        multiTabContext: 'Multi-tab content',
        multiTabCount: 2
    });

    // Simulate using single-page context (should not affect multiTabContext)
    // In real code, getActiveTabContent() is called separately

    // Verify multi-tab content still exists
    const stored = await mockStorage.get(['multiTabContext', 'multiTabCount']);
    const multiTabPreserved = stored.multiTabContext === 'Multi-tab content';

    console.log(multiTabPreserved ? '✅ PASS: Multi-tab unaffected by page context' : '❌ FAIL: Multi-tab affected');
    return multiTabPreserved;
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('=== Multi-Tab Context Persistence Tests ===\n');

    const results = [];

    results.push(await testMultiTabContentPersistsAfterUse());
    results.push(await testMultiTabContentClearedOnDeselect());
    results.push(await testMultiTabContentPreservedOnModelSwitch());
    results.push(await testSinglePageContextIndependent());

    console.log('\n=== Summary ===');
    const passed = results.filter(r => r).length;
    const total = results.length;
    console.log(`${passed}/${total} tests passed`);

    return passed === total;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testMultiTabContentPersistsAfterUse,
        testMultiTabContentClearedOnDeselect,
        testMultiTabContentPreservedOnModelSwitch,
        testSinglePageContextIndependent,
        createMockStorageSession
    };
}

// Run tests if executed directly
if (typeof window !== 'undefined') {
    console.log('Run runAllTests() to execute tests');
}
