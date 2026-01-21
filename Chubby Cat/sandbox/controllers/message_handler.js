
// sandbox/controllers/message_handler.js
import { appendMessage } from '../render/message.js';
import { cropImage } from '../../lib/crop_utils.js';
import { t } from '../core/i18n.js';
import { WatermarkRemover } from '../../lib/watermark_remover.js';

export class MessageHandler {
    constructor(sessionManager, uiController, imageManager, appController) {
        this.sessionManager = sessionManager;
        this.ui = uiController;
        this.imageManager = imageManager;
        this.app = appController; // Reference back to app for state like captureMode
        this.streamingBubble = null;
    }

    async handle(request) {
        // MCP server test result
        if (request.action === "MCP_TEST_RESULT") {
            if (this.ui && this.ui.settings && typeof this.ui.settings.updateMcpTestResult === 'function') {
                this.ui.settings.updateMcpTestResult(request);
            }
            return;
        }

        if (request.action === "MCP_TOOLS_RESULT") {
            if (this.ui && this.ui.settings && typeof this.ui.settings.updateMcpToolsResult === 'function') {
                this.ui.settings.updateMcpToolsResult(request);
            }
            return;
        }

        // 0. Stream Update
        if (request.action === "AI_STREAM_UPDATE") {
            this.handleStreamUpdate(request);
            return;
        }

        // 1. AI Reply
        if (request.action === "AI_REPLY") {
            this.handleAIReply(request);
            return;
        }

        // 2. Image Fetch Result (For User Uploads)
        if (request.action === "FETCH_IMAGE_RESULT") {
            this.handleImageResult(request);
            return;
        }

        // 2.1 Generated Image Result (Proxy Fetch for Display)
        if (request.action === "GENERATED_IMAGE_RESULT") {
            await this.handleGeneratedImageResult(request);
            return;
        }

        // 3. Capture Result (Crop & OCR)
        if (request.action === "CROP_SCREENSHOT") {
            await this.handleCropResult(request);
            return;
        }

        // 4. Mode Sync (from Context Menu)
        if (request.action === "SET_SIDEBAR_CAPTURE_MODE") {
            this.app.setCaptureMode(request.mode);
            let statusText = t('selectSnip');
            if (request.mode === 'ocr') statusText = t('selectOcr');
            if (request.mode === 'screenshot_translate') statusText = t('selectTranslate');

            this.ui.updateStatus(statusText);
            return;
        }

        // 5. Quote Selection Result
        if (request.action === "SELECTION_RESULT") {
            this.handleSelectionResult(request);
            return;
        }

        // 6. Page Context Toggle (from Context Menu)
        if (request.action === "TOGGLE_PAGE_CONTEXT") {
            this.app.setPageContext(request.enable);
            return;
        }

        // 7. Capture Error
        if (request.action === "CAPTURE_ERROR") {
            this.ui.updateStatus(request.error || t('errorScreenshot'));
            setTimeout(() => this.ui.updateStatus(""), 3000);
            return;
        }
    }

    handleStreamUpdate(request) {
        // Prevent race condition: Ignore stream updates arriving shortly after user cancelled
        if (this.app.prompt.isCancellationRecent()) return;

        // If we don't have a bubble yet, create one
        if (!this.streamingBubble) {
            this.streamingBubble = appendMessage(this.ui.historyDiv, "", 'ai', null, "");
        }

        // Update content if text or thoughts exist
        this.streamingBubble.update(request.text, request.thoughts);

        // Ensure UI state reflects generation
        if (!this.app.isGenerating) {
            this.app.isGenerating = true;
            this.ui.setLoading(true);
        }
    }

    handleAIReply(request) {
        console.log('[Chubby Cat] handleAIReply called', { status: request.status, action: request.action });

        this.app.isGenerating = false;
        this.ui.setLoading(false);

        // Clear safety timeout since backend responded successfully
        if (this.app.prompt && this.app.prompt._clearSafetyTimeout) {
            this.app.prompt._clearSafetyTimeout();
        }

        const session = this.sessionManager.getCurrentSession();
        if (session) {
            // Note: We do NOT save to sessionManager/storage here anymore.
            // The background script saves the AI response to storage and broadcasts 'SESSIONS_UPDATED'.
            // The AppController handles that broadcast to keep data in sync.
            // We just ensure the UI is visually complete here.

            if (request.status === 'success') {
                // Although session data comes from background, we might want to ensure context matches locally
                // just in case further user prompts happen before SESSIONS_UPDATED arrives (rare)
                this.sessionManager.updateContext(session.id, request.context);
            }

            // Update UI
            if (this.streamingBubble) {
                // Finalize the streaming bubble with complete text and thoughts
                this.streamingBubble.update(request.text, request.thoughts);

                // Inject images if any
                if (request.images && request.images.length > 0) {
                    this.streamingBubble.addImages(request.images);
                }

                // Handle errors - show error message and enable regenerate button
                if (request.status !== 'success') {
                    // Add error indicator to the message
                    const errorText = request.text || t('errorScreenshot');
                    this.streamingBubble.update(errorText, request.thoughts);

                    // Show error status
                    this.ui.updateStatus(errorText);
                    setTimeout(() => this.ui.updateStatus(""), 5000);
                }

                // Always enable the regenerate button after completion (success or error)
                if (this.streamingBubble.enableRegenerate) {
                    this.streamingBubble.enableRegenerate();
                }

                // Clear reference
                this.streamingBubble = null;
            } else {
                // Fallback if no stream occurred (or single short response)
                const bubble = appendMessage(this.ui.historyDiv, request.text, 'ai', request.images, request.thoughts);

                // Enable regenerate button immediately for non-streamed responses
                if (bubble && bubble.enableRegenerate) {
                    bubble.enableRegenerate();
                }

                // Show error if present
                if (request.status !== 'success') {
                    const errorText = request.text || t('errorScreenshot');
                    this.ui.updateStatus(errorText);
                    setTimeout(() => this.ui.updateStatus(""), 5000);
                }
            }
        } else {
            // No active session - still need to show error and handle UI state
            if (request.status !== 'success') {
                const errorText = request.text || t('errorScreenshot');
                this.ui.updateStatus(errorText);
                setTimeout(() => this.ui.updateStatus(""), 5000);
            }
        }

        // CRITICAL: Re-enable ALL regenerate buttons in the chat after any completion
        // This ensures buttons work even after errors, regardless of session state
        this.enableAllRegenerateButtons();
    }


    handleImageResult(request) {
        this.ui.updateStatus("");
        if (request.error) {
            console.error("Image fetch failed", request.error);
            this.ui.updateStatus(t('failedLoadImage'));
            setTimeout(() => this.ui.updateStatus(""), 3000);
        } else {
            this.imageManager.setFile(request.base64, request.type, request.name);
        }
    }

    async handleGeneratedImageResult(request) {
        // Find the placeholder image by ID
        const img = document.querySelector(`img[data-req-id="${request.reqId}"]`);
        if (img) {
            if (request.base64) {
                try {
                    // Apply Watermark Removal
                    const cleanedBase64 = await WatermarkRemover.process(request.base64);
                    img.src = cleanedBase64;
                } catch (e) {
                    console.warn("Watermark removal failed, using original", e);
                    img.src = request.base64;
                }

                img.classList.remove('loading');
                img.style.minHeight = "auto";
            } else {
                // Handle error visually
                img.style.background = "#ffebee"; // Light red
                img.alt = "Failed to load image";
                console.warn("Generated image load failed:", request.error);
            }
        }
    }

    async handleCropResult(request) {
        this.ui.updateStatus(t('processingImage'));
        try {
            const croppedBase64 = await cropImage(request.image, request.area);
            this.imageManager.setFile(croppedBase64, 'image/png', 'snip.png');

            if (this.app.captureMode === 'ocr') {
                // Change prompt to localized OCR instructions
                this.ui.inputFn.value = t('ocrPrompt');
                // Auto-send via the main controller
                this.app.handleSendMessage();
            } else if (this.app.captureMode === 'screenshot_translate') {
                // Change prompt to localized Translate instructions
                this.ui.inputFn.value = t('screenshotTranslatePrompt');
                this.app.handleSendMessage();
            } else {
                this.ui.updateStatus("");
                this.ui.inputFn.focus();
            }
        } catch (e) {
            console.error("Crop error", e);
            this.ui.updateStatus(t('errorScreenshot'));
        }
    }

    handleSelectionResult(request) {
        if (request.text && request.text.trim()) {
            const quote = `> ${request.text.trim()}\n\n`;
            const input = this.ui.inputFn;
            // Append to new line if text exists
            input.value = input.value ? input.value + "\n\n" + quote : quote;
            input.focus();
            // Trigger resize
            input.dispatchEvent(new Event('input'));
        } else {
            this.ui.updateStatus(t('noTextSelected'));
            setTimeout(() => this.ui.updateStatus(""), 2000);
        }
    }

    // Called by AppController on cancel/switch
    resetStream() {
        if (this.streamingBubble) {
            this.streamingBubble = null;
        }
    }

    /**
     * Enable all regenerate buttons in the chat history
     * This is useful to ensure buttons work after errors or state resets
     */
    enableAllRegenerateButtons() {
        console.log('[Chubby Cat] enableAllRegenerateButtons called');
        const chatHistory = this.ui.historyDiv;
        if (!chatHistory) {
            console.warn('[Chubby Cat] No chat history div found');
            return;
        }

        const allRegenerateButtons = chatHistory.querySelectorAll('.regenerate-btn');
        console.log('[Chubby Cat] Found', allRegenerateButtons.length, 'regenerate buttons to enable');

        allRegenerateButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('loading');
            if (btn.dataset.iconDefault) {
                btn.innerHTML = btn.dataset.iconDefault;
            }
        });
    }

    /**
     * Disable all regenerate buttons in the chat history
     * This is useful when starting a new generation to prevent multiple concurrent requests
     */
    disableAllRegenerateButtons() {
        const chatHistory = this.ui.historyDiv;
        if (!chatHistory) return;

        const allRegenerateButtons = chatHistory.querySelectorAll('.regenerate-btn');
        allRegenerateButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('loading');
            if (btn.dataset.iconLoading) {
                btn.innerHTML = btn.dataset.iconLoading;
            }
        });
    }
}
