# Tests

This directory contains tests for verifying bug fixes and functionality.

## Test Files

### Unit Tests

- **`session_flow.test.js`** - Tests for session flow controller
  - Input preservation when switching sessions
  - Input preservation when creating new chat
  - Input cleared after sending message (expected behavior)
- **`storage_management.test.js`** - Tests for storage management and upload handling
  - Session hard limit and near-limit cleanup
  - Storage threshold cleanup
  - Image compression and upload size limit

- **`multi_tab_context.test.js`** - Tests for multi-tab context persistence
  - Content persists after first message
  - Content cleared when user deselects tabs
  - Content preserved across model switch
  - Single-page context independent of multi-tab

### Integration Tests

- **`integration.test.js`** - Manual integration tests
  - Complete multi-tab context flow
  - Input preservation flow
  - Storage verification

## Running Tests

### Unit Tests

You can run unit tests in the browser console:

```javascript
// Load the test file
const script = document.createElement('script');
script.src = chrome.runtime.getURL('tests/session_flow.test.js');
document.head.appendChild(script);

// Then run
runAllTests();
```

Or using Node.js (if using a test runner like Jest):

```bash
npm test
```

### Integration Tests

1. Open the extension
2. Open the sidebar
3. Open browser developer console (F12)
4. Load the integration test file
5. Run `runIntegrationTests()`
6. Follow the manual test steps displayed

## Test Coverage

| Feature | Unit Tests | Integration Tests |
|---------|:----------:|:-----------------:|
| Input preservation on session switch | ✅ | ✅ |
| Input preservation on new chat | ✅ | ✅ |
| Input cleared after send | ✅ | - |
| Multi-tab content persistence | ✅ | ✅ |
| Multi-tab content on model switch | ✅ | ✅ |
| Multi-tab deselection | ✅ | - |
| Page context independence | ✅ | - |

## Related Files

- `sandbox/controllers/session_flow.js` - Session switching logic
- `sandbox/ui/chat.js` - Input field management
- `sandbox/ui/active_tab.js` - Multi-tab selection UI
- `background/handlers/session/prompt/builder.js` - Multi-tab context handling
- `background/handlers/ui.js` - Tab content import/clear
