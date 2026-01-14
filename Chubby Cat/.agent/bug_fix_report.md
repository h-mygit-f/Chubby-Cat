# Bug Fix Report: Multi-Tab Content Loss and User Input Preservation

## Date: 2026-01-14

---

## Issue 1: Multi-Tab Content Loss When Switching Models or Creating New Chat

### Problem Description
When users have selected multiple tabs in multi-tab mode:
1. Switching models would cause the selected web page content to be lost
2. Creating a new chat window would also lose the selected tab content

### Root Cause Analysis

**Finding 1: Multi-tab content was cleared after first use**

Location: `background/handlers/session/prompt/builder.js` (lines 21-22)

```javascript
// Clear after use (single use per prompt)
await chrome.storage.session.remove(['multiTabContext', 'multiTabCount']);
```

The multi-tab content stored in `chrome.storage.session` was being cleared immediately after the first message was sent. This meant:
- First message: ✓ Content included correctly
- Subsequent messages: ✗ Content no longer available

This was a design flaw - the content should persist throughout the conversation until the user explicitly deselects the tabs.

**Finding 2: Frontend state was not synchronized with backend**

The `ActiveTabController` maintains `selectedTabIds` in memory, which persists across model switches. However, if the backend had already cleared the content, the visual state (tabs appearing selected) didn't match the actual data state (content already deleted).

### Fix Applied

**File: `background/handlers/session/prompt/builder.js`**

Changed:
```javascript
// Clear after use (single use per prompt)
await chrome.storage.session.remove(['multiTabContext', 'multiTabCount']);
```

To:
```javascript
// Note: We intentionally do NOT clear multiTabContext here.
// The content should persist throughout the conversation until
// the user explicitly deselects tabs (which triggers CLEAR_MULTI_TAB_CONTEXT).
```

**Impact:**
- Multi-tab content now persists throughout the entire conversation
- Users can continue chatting with the same web content across multiple messages
- Content is only cleared when:
  - User explicitly deselects all tabs
  - User calls `deselectAll()`
  - System calls `resetContext()` (not currently used in normal flow)

---

## Issue 2: User Input Content Loss When Starting New Chat

### Problem Description
When users had entered text in the input box but hadn't sent it yet, clicking "Start New Chat" would clear the input, losing the user's draft.

### Root Cause Analysis

Location: `sandbox/controllers/session_flow.js` (line 54)

```javascript
switchToSession(sessionId) {
    // ... other code ...
    this.refreshHistoryUI();
    this.ui.resetInput();  // <-- This line clears the input
}
```

The `handleNewChat()` method calls `switchToSession()`, which unconditionally called `this.ui.resetInput()`. The `resetInput()` method in `chat.js` clears the input value:

```javascript
resetInput() {
    if (this.inputFn) {
        this.inputFn.value = '';  // Clears user input!
        this.inputFn.style.height = 'auto';
        this.inputFn.focus();
    }
}
```

### Fix Applied

**File: `sandbox/controllers/session_flow.js`**

Changed:
```javascript
this.refreshHistoryUI();
this.ui.resetInput();
```

To:
```javascript
this.refreshHistoryUI();
// Note: We intentionally do NOT call this.ui.resetInput() here.
// User's current input should be preserved when switching sessions.
// Input is only cleared when a message is sent (in prompt.js).
```

**Impact:**
- User's draft input is now preserved when switching between sessions
- User's draft input is preserved when creating a new chat
- Input is only cleared after the user actually sends a message (in `prompt.js` line 63)
- This provides a "sticky draft" experience similar to modern chat applications

---

## Files Modified

1. **`sandbox/controllers/session_flow.js`**
   - Removed `resetInput()` call from `switchToSession()`
   - Added explanatory comment

2. **`background/handlers/session/prompt/builder.js`**
   - Removed automatic clearing of `multiTabContext` after use
   - Added explanatory comment

---

## Testing Recommendations

### Manual Testing Scenarios

#### Test Case 1: Multi-tab content persistence across messages
1. Open the extension sidebar
2. Click on the tab display to open multi-tab selector
3. Select 2-3 tabs for context import
4. Send a message asking about the content
5. Send another follow-up message
6. **Expected:** Both messages should have access to the multi-tab content

#### Test Case 2: Multi-tab content persistence on model switch
1. Select multiple tabs for context
2. Send a message
3. Switch to a different model (e.g., from "Fast" to "Thinking")
4. Send another message
5. **Expected:** The second message should still include the tab content

#### Test Case 3: User input preservation on new chat
1. Type some text in the input box (don't send)
2. Click "New Chat" button
3. **Expected:** The text should still be in the input box

#### Test Case 4: User input preservation on session switch
1. Type some text in the input box (don't send)
2. Open history sidebar and click on a different session
3. **Expected:** The text should still be in the input box

#### Test Case 5: Multi-tab deselection properly clears content
1. Select multiple tabs for context
2. Deselect all tabs (or click "Deselect All")
3. Send a message
4. **Expected:** The message should NOT include the previously selected tab content

---

## Compatibility Considerations

### Existing Functionality Preserved
- Single-page context ("网页" button) continues to work independently
- Browser control functionality unaffected
- Model switching logic unaffected
- Settings and configuration unchanged

### Backward Compatibility
- No changes to storage schema
- No changes to message format
- No changes to API contracts

---

## Performance Considerations

- Multi-tab content now stays in `chrome.storage.session` longer
- Memory usage may be slightly higher during extended sessions
- No noticeable impact expected for typical usage patterns
- Content is cleared when user explicitly deselects tabs or starts a fresh session

---

## Conclusion

Both bugs have been fixed with minimal, targeted changes:
1. **Multi-tab content** now persists correctly throughout conversations
2. **User input** is now preserved when navigating between sessions

The fixes maintain backward compatibility and don't affect other functionality.
