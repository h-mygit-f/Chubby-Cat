
// lib/markdown_export.js
import { TOOL_OUTPUT_MARKER, TOOL_OUTPUT_PREFIX } from './constants.js';

function isToolOutputMessage(msg) {
    if (!msg) return false;
    if (msg.isToolOutput === true) return true;
    if (!msg.text || typeof msg.text !== 'string') return false;
    const normalized = msg.text.trimStart();
    return normalized.startsWith(TOOL_OUTPUT_PREFIX) || normalized.startsWith(TOOL_OUTPUT_MARKER);
}

/**
 * Generate filename in MMDD_HHMM.md format
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Filename
 */
export function generateFilename(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${MM}${DD}_${HH}${mm}.md`;
}

/**
 * Convert session messages to Markdown format
 * @param {Object} session - Session object with messages array
 * @returns {string} Markdown content
 */
export function sessionToMarkdown(session) {
    if (!session || !session.messages || session.messages.length === 0) {
        return '';
    }

    const lines = [];

    // Add title
    lines.push(`# ${session.title || 'Chat'}`);
    lines.push('');

    // Add timestamp
    const date = new Date(session.timestamp || Date.now());
    lines.push(`*${date.toLocaleString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Convert messages
    for (const msg of session.messages) {
        if (isToolOutputMessage(msg)) continue;
        const role = msg.role === 'user' ? '**User**' : '**Assistant**';
        lines.push(role);
        lines.push('');

        // Add thinking/thoughts if present
        if (msg.thoughts) {
            lines.push('<details>');
            lines.push('<summary>Thinking</summary>');
            lines.push('');
            lines.push(msg.thoughts);
            lines.push('');
            lines.push('</details>');
            lines.push('');
        }

        // Add main content
        lines.push(msg.text || '');
        lines.push('');

        // Note if there was an image attachment
        if (msg.image) {
            lines.push('*[Image attached]*');
            lines.push('');
        }

        // Note if there were generated images
        if (msg.generatedImages && msg.generatedImages.length > 0) {
            lines.push(`*[${msg.generatedImages.length} image(s) generated]*`);
            lines.push('');
        }

        lines.push('---');
        lines.push('');
    }

    return lines.join('\n');
}
