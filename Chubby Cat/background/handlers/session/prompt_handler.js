
// background/handlers/session/prompt_handler.js
import { appendAiMessage, appendUserMessage } from '../../managers/history_manager.js';
import { TOOL_OUTPUT_PREFIX } from '../../../lib/constants.js';
import { PromptBuilder } from './prompt/builder.js';
import { ToolExecutor } from './prompt/tool_executor.js';

// Helper to prevent rapid-fire requests that trigger rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class PromptHandler {
    constructor(sessionManager, mcpManager) {
        this.sessionManager = sessionManager;
        this.builder = new PromptBuilder(mcpManager);
        this.toolExecutor = new ToolExecutor(mcpManager);
        this.isCancelled = false;
    }

    cancel() {
        this.isCancelled = true;
    }

    handle(request, sendResponse) {
        this.isCancelled = false;
        console.log('[Chubby Cat] PromptHandler.handle() started');

        (async () => {
            const onUpdate = (partialText, partialThoughts) => {
                // Catch errors if receiver (UI) is closed/unavailable
                chrome.runtime.sendMessage({
                    action: "AI_STREAM_UPDATE",
                    text: partialText,
                    thoughts: partialThoughts
                }).catch(() => { });
            };

            try {
                console.log('[Chubby Cat] Starting prompt processing');
                // 1. Build Initial Prompt (with Preamble/Context separated)
                const buildResult = await this.builder.build(request);
                const systemInstruction = buildResult.systemInstruction;
                let currentPromptText = buildResult.userPrompt;

                let currentFiles = request.files;

                let loopCount = 0;
                // 0 means unlimited (Infinity). Default to 0 if undefined.
                const reqLoops = request.maxLoops !== undefined ? request.maxLoops : 0;
                const MAX_LOOPS = reqLoops === 0 ? Infinity : reqLoops;

                let keepLooping = true;

                // --- AUTOMATED FEEDBACK LOOP ---
                while (keepLooping && loopCount < MAX_LOOPS) {
                    if (this.isCancelled) break;

                    // 2. Send to Gemini
                    const result = await this.sessionManager.handleSendPrompt({
                        ...request,
                        text: currentPromptText,
                        systemInstruction: systemInstruction, // Pass system instruction
                        files: currentFiles
                    }, onUpdate);

                    if (this.isCancelled) break;

                    if (!result || result.status !== 'success') {
                        // If error, notify UI and break loop
                        console.log('[Chubby Cat] Error result received:', result ? result.status : 'null');

                        // IMPORTANT: Save error message to session so regenerate() can find and remove it
                        if (request.sessionId && result) {
                            await appendAiMessage(request.sessionId, result);
                            console.log('[Chubby Cat] Error message saved to session');
                        }

                        if (result) {
                            console.log('[Chubby Cat] Sending error AI_REPLY to UI');
                            chrome.runtime.sendMessage(result).catch((e) => {
                                console.error('[Chubby Cat] Failed to send error message:', e);
                            });
                        } else {
                            console.warn('[Chubby Cat] Result is null, sending default error AI_REPLY');
                            // If result is null (e.g., AbortError was quietly caught), send a generic error
                            const defaultError = {
                                action: "AI_REPLY",
                                text: "Error: Request failed or was cancelled",
                                status: "error"
                            };
                            // Also save this to session
                            if (request.sessionId) {
                                await appendAiMessage(request.sessionId, defaultError);
                            }
                            chrome.runtime.sendMessage(defaultError).catch((e) => {
                                console.error('[Chubby Cat] Failed to send default error message:', e);
                            });
                        }
                        break;
                    }

                    // 3. Save AI Response to History
                    if (request.sessionId) {
                        await appendAiMessage(request.sessionId, result);
                    }

                    // Notify UI of the result (replaces streaming bubble)
                    chrome.runtime.sendMessage(result).catch(() => { });

                    // 4. Process Tool Execution (if any)
                    let toolResult = null;
                    if (request.enableMcpTools) {
                        toolResult = await this.toolExecutor.executeIfPresent(result.text, request, onUpdate);
                    }

                    if (this.isCancelled) break;

                    // 5. Decide Next Step
                    if (toolResult) {
                        // Tool executed, feed back to model (Loop continues)
                        loopCount++;
                        currentFiles = toolResult.files || []; // Send new files if any, or clear previous files

                        let outputForModel = toolResult.output;

                        // Format observation for the model
                        currentPromptText = `[Tool Output from ${toolResult.toolName}]:\n\`\`\`\n${outputForModel}\n\`\`\`\n\n(Proceed with the next step or confirm completion)`;

                        // Save "User" message (Tool Output) to history to keep context in sync
                        // NOTE: We do NOT save the massive auto-snapshot text to the user history to keep the UI clean.
                        if (request.sessionId) {
                            const userMsg = `${TOOL_OUTPUT_PREFIX}\n\`\`\`\n${toolResult.output}\n\`\`\`\n\n*(Proceeding to step ${loopCount + 1})*`;

                            let historyImages = toolResult.files ? toolResult.files.map(f => f.base64) : null;
                            await appendUserMessage(request.sessionId, userMsg, historyImages, { isToolOutput: true });
                        }

                        // Update UI status
                        const loopStatus = MAX_LOOPS === Infinity ? `${loopCount}` : `${loopCount}/${MAX_LOOPS}`;
                        onUpdate("Thinking...", `Observed output from tool. Planning next step (${loopStatus})...`);

                        // === RATE LIMIT MITIGATION ===
                        // Wait 2-4 seconds before sending the next request.
                        // This prevents "No valid response" errors caused by rapid-fire requests.
                        await delay(2000 + Math.random() * 2000);

                        if (this.isCancelled) break;

                    } else {
                        // No tool execution, final answer reached
                        keepLooping = false;
                    }
                }

            } catch (e) {
                console.error("Prompt loop error:", e);
                chrome.runtime.sendMessage({
                    action: "AI_REPLY",
                    text: "Error: " + e.message,
                    status: "error"
                }).catch(() => { });
            } finally {
                sendResponse({ status: "completed" });
            }
        })();
        return true;
    }
}
