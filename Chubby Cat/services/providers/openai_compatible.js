
// services/providers/openai_compatible.js

/**
 * Sends a message using an OpenAI Compatible API or Claude API.
 * Supports both OpenAI and Claude (Anthropic) API formats.
 */
export async function sendOpenAIMessage(prompt, systemInstruction, history, config, files, signal, onUpdate) {
    let { baseUrl, apiKey, model, providerType } = config;

    if (!baseUrl) throw new Error("Base URL is missing.");
    if (!model) throw new Error("Model ID is missing.");

    // Default to 'openai' for backward compatibility
    const isClaude = providerType === 'claude';

    // Normalize Base URL (remove trailing slash)
    baseUrl = baseUrl.replace(/\/$/, "");

    // Claude uses /v1/messages, OpenAI uses /chat/completions
    const url = isClaude
        ? `${baseUrl}/v1/messages`
        : `${baseUrl}/chat/completions`;

    // Build request based on provider type
    let payload, headers;

    if (isClaude) {
        // === Claude API Format ===
        const messages = [];

        // Helper to format content for Claude (Text + Image)
        const formatClaudeContent = (text, images) => {
            if (!images || images.length === 0) {
                return text || "";
            }

            const content = [];
            if (text) {
                content.push({ type: "text", text: text });
            }

            images.forEach(img => {
                // img is base64 string "data:image/png;base64,..."
                const parts = img.split(',');
                if (parts.length === 2) {
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    const mediaType = mimeMatch ? mimeMatch[1] : 'image/png';
                    content.push({
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: mediaType,
                            data: parts[1]
                        }
                    });
                }
            });

            return content;
        };

        // History
        if (history && Array.isArray(history)) {
            history.forEach(msg => {
                const role = msg.role === 'ai' ? 'assistant' : 'user';
                const images = (msg.role === 'user' && msg.image) ? msg.image : [];

                messages.push({
                    role: role,
                    content: formatClaudeContent(msg.text, images)
                });
            });
        }

        // Current Prompt
        const currentImages = [];
        if (files && files.length > 0) {
            files.forEach(f => {
                currentImages.push(f.base64);
            });
        }

        messages.push({
            role: "user",
            content: formatClaudeContent(prompt, currentImages)
        });

        payload = {
            model: model,
            messages: messages,
            max_tokens: config.maxTokens || 8192,
            stream: true
        };

        // Claude uses system as a separate field, not in messages
        if (systemInstruction) {
            payload.system = systemInstruction;
        }

        // Claude extended thinking support
        if (config.thinkingEnabled) {
            payload.thinking = {
                type: "enabled",
                budget_tokens: config.thinkingBudget || 10000
            };
            // Extended thinking requires higher max_tokens
            payload.max_tokens = Math.max(payload.max_tokens, 16000);
        }

        headers = {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        };

        if (apiKey) {
            headers['x-api-key'] = apiKey;
        }

        console.debug(`[Claude API] Requesting ${model} at ${url}...`);

    } else {
        // === OpenAI Compatible Format ===
        const messages = [];

        // System Message
        if (systemInstruction) {
            messages.push({ role: "system", content: systemInstruction });
        }

        // Helper to format content (Text + Image)
        const formatOpenAIContent = (text, images) => {
            if (!images || images.length === 0) {
                return text || "";
            }

            const content = [];
            if (text) {
                content.push({ type: "text", text: text });
            }

            images.forEach(img => {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: img
                    }
                });
            });

            return content;
        };

        // History
        if (history && Array.isArray(history)) {
            history.forEach(msg => {
                const role = msg.role === 'ai' ? 'assistant' : 'user';
                const images = (msg.role === 'user' && msg.image) ? msg.image : [];

                messages.push({
                    role: role,
                    content: formatOpenAIContent(msg.text, images)
                });
            });
        }

        // Current Prompt
        const currentImages = [];
        if (files && files.length > 0) {
            files.forEach(f => {
                currentImages.push(f.base64);
            });
        }

        messages.push({
            role: "user",
            content: formatOpenAIContent(prompt, currentImages)
        });

        payload = {
            model: model,
            messages: messages,
            stream: true
        };

        headers = {
            'Content-Type': 'application/json'
        };

        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        console.debug(`[OpenAI Compatible] Requesting ${model} at ${url}...`);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal
    });

    if (!response.ok) {
        let errorText = await response.text();
        try {
            const errJson = JSON.parse(errorText);
            if (errJson.error && errJson.error.message) errorText = errJson.error.message;
        } catch (e) { }
        throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let rawContent = ""; // Accumulates all content, including <think> tags
    let reasoningThoughts = ""; // Accumulates reasoning_content field or Claude thinking
    let finalVisibleText = "";
    let finalThoughts = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        let lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.substring(6);
                if (dataStr === '[DONE]') continue;

                try {
                    const data = JSON.parse(dataStr);

                    if (isClaude) {
                        // === Claude SSE Format ===
                        // Handle content_block_delta events
                        if (data.type === 'content_block_delta' && data.delta) {
                            if (data.delta.type === 'text_delta' && data.delta.text) {
                                rawContent += data.delta.text;
                            } else if (data.delta.type === 'thinking_delta' && data.delta.thinking) {
                                // Extended thinking content
                                reasoningThoughts += data.delta.thinking;
                            }
                        }

                        // Handle message_delta for stop reason
                        if (data.type === 'message_delta') {
                            // Message is complete
                        }

                        // Update UI
                        finalVisibleText = rawContent;
                        finalThoughts = reasoningThoughts.trim();
                        onUpdate(finalVisibleText, finalThoughts || null);

                    } else {
                        // === OpenAI Compatible SSE Format ===
                        if (data.choices && data.choices.length > 0) {
                            const delta = data.choices[0].delta;

                            // Standard Content
                            if (delta.content) {
                                rawContent += delta.content;
                            }

                            // Reasoning Content (DeepSeek R1 style or similar extension)
                            if (delta.reasoning_content) {
                                reasoningThoughts += delta.reasoning_content;
                            }

                            // Process rawContent to extract <think> tags
                            let visibleText = rawContent;
                            let extractedThoughts = "";

                            // 1. Extract complete <think>...</think> blocks
                            visibleText = visibleText.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
                                extractedThoughts += content + "\n";
                                return "";
                            });

                            // 2. Handle incomplete <think>... at the end (streaming)
                            visibleText = visibleText.replace(/<think>([\s\S]*)$/, (match, content) => {
                                extractedThoughts += content;
                                return "";
                            });

                            finalVisibleText = visibleText;
                            // Combine specialized reasoning_content and extracted <think> content
                            const totalThoughts = (reasoningThoughts + extractedThoughts).trim();
                            finalThoughts = totalThoughts;

                            onUpdate(finalVisibleText, finalThoughts || null);
                        }
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    }

    return {
        text: finalVisibleText,
        thoughts: finalThoughts || null,
        images: [],
        context: null
    };
}
