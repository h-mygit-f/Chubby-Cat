
// background/handlers/session/utils.js

export function parseToolCommand(responseText) {
    // 1. Try to extract from Markdown code block first (most reliable)
    // Matches ```json { ... } ``` or ``` { ... } ```
    const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if (codeBlockMatch) {
        try {
            const cmd = JSON.parse(codeBlockMatch[1]);
            if (cmd.tool && cmd.args) return { name: cmd.tool, args: cmd.args };
        } catch (e) {
            // fall through to fuzzy search
        }
    }

    // 2. Fallback: Robustly scan for a JSON object containing "tool": "..."
    // This handles cases where the model outputs raw JSON without markdown fences,
    // or includes preamble/postscript text.
    
    // Find all occurrences of "tool": to identify potential start points
    const regex = /"tool"\s*:/g;
    let match;
    const indices = [];
    while ((match = regex.exec(responseText)) !== null) {
        indices.push(match.index);
    }
    
    // Iterate backwards from the last occurrence (tools usually appear at the end)
    for (let i = indices.length - 1; i >= 0; i--) {
        const toolIdx = indices[i];
        
        // Find the nearest opening brace '{' before "tool":
        const openBraceIdx = responseText.lastIndexOf('{', toolIdx);
        if (openBraceIdx === -1) continue;
        
        // Extract the substring starting from this brace
        const subStrStart = responseText.substring(openBraceIdx);
        
        // Try to find a valid closing brace '}' that forms valid JSON
        // We search backwards from the end of the string to find the matching closing brace
        let searchEnd = subStrStart.length;
        while (searchEnd > 0) {
            const closeIdx = subStrStart.lastIndexOf('}', searchEnd - 1);
            if (closeIdx === -1) break;
            
            const candidate = subStrStart.substring(0, closeIdx + 1);
            try {
                const cmd = JSON.parse(candidate);
                // Validate structure matches our protocol
                if (cmd.tool && cmd.args) {
                    return {
                        name: cmd.tool,
                        args: cmd.args
                    };
                }
            } catch (e) {
                // Invalid JSON, possibly captured trailing text or incomplete structure
                // Continue shrinking the window to the previous '}'
            }
            searchEnd = closeIdx;
        }
    }

    return null;
}

export async function getActiveTabContent(specificTabId = null) {
    try {
        let tab;
        if (specificTabId) {
            try {
                tab = await chrome.tabs.get(specificTabId);
            } catch (e) {
                // Specific tab not found
                return null;
            }
        } else {
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            tab = tabs[0];
        }

        if (!tab || !tab.id) return null;

        // Check for restricted URLs
        if (tab.url && (
            tab.url.startsWith('chrome://') || 
            tab.url.startsWith('edge://') || 
            tab.url.startsWith('chrome-extension://') || 
            tab.url.startsWith('about:') ||
            tab.url.startsWith('view-source:') ||
            tab.url.startsWith('https://chrome.google.com/webstore') ||
            tab.url.startsWith('https://chromewebstore.google.com')
        )) {
            return null;
        }

        // Strategy 1: Try sending message to existing content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_CONTENT" });
            return response ? response.content : null;
        } catch (e) {
            // Strategy 2: Fallback to Scripting Injection
            console.log("Content script unavailable, attempting fallback injection...");
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => document.body ? document.body.innerText : ""
                });
                return results?.[0]?.result || null;
            } catch (injErr) {
                console.error("Fallback injection failed:", injErr);
                return null;
            }
        }
    } catch (e) {
        console.error("Failed to get page context:", e);
        return null;
    }
}
