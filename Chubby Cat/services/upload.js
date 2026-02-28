
// services/upload.js
import { dataUrlToBlob } from '../lib/utils.js';

// Transient server-side errors that are safe to retry (e.g. Gemini 502 "AssetsUploadReverse" TLS glitches)
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const MAX_UPLOAD_RETRIES = 3;

/**
 * Upload a single file to Google's content-push service.
 * Automatically retries on transient server-side errors (502/503/504)
 * with exponential backoff, since Gemini occasionally returns:
 *   "API Error (502): AssetsUploadReverse: Upload failed, Failed to perform,
 *    curl: (35) TLS connect error: error:00000000:invalid library (0):OPENSSL_internal:invalid library (0)"
 * This is a server-side TLS glitch on Google's infrastructure and is not
 * caused by client code — retrying typically resolves it.
 */
export async function uploadFile(fileObj, signal) {
    console.log("Uploading file...", fileObj.name);

    // 1. Prepare Blob (only once — reused across retries)
    const blob = await dataUrlToBlob(fileObj.base64);

    let lastError;
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
        // Bail immediately if the request was cancelled
        if (signal && signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        try {
            // 2. Prepare FormData (recreated each attempt — FormData is not reusable after fetch)
            const formData = new FormData();
            formData.append('file', blob, fileObj.name);

            // 3. Execute Upload to Google's content-push service
            const response = await fetch('https://content-push.googleapis.com/upload', {
                method: 'POST',
                signal: signal,
                headers: {
                    'Push-ID': 'feeds/mcudyrk2a4khkz'
                },
                body: formData
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                const err = new Error(`Upload failed: ${response.status}${errorBody ? ` — ${errorBody.substring(0, 200)}` : ''}`);
                err.status = response.status;

                // Only retry on known transient server errors
                if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_UPLOAD_RETRIES) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
                    console.warn(`[Upload] Server error ${response.status} on attempt ${attempt}/${MAX_UPLOAD_RETRIES}, retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    lastError = err;
                    continue;
                }

                throw err;
            }

            const responseText = await response.text();
            if (attempt > 1) {
                console.log(`File upload success (after ${attempt} attempts)`);
            } else {
                console.log("File upload success");
            }

            // Returns the identifier (e.g. /contrib_service/ttl_1d/...)
            return responseText;

        } catch (err) {
            // Propagate abort/cancel immediately without retrying
            if (err.name === 'AbortError') throw err;
            // Re-throw non-retryable errors (already thrown above), or final attempt
            if (!RETRYABLE_STATUS_CODES.has(err.status) || attempt >= MAX_UPLOAD_RETRIES) {
                throw err;
            }
            lastError = err;
        }
    }

    // Should not reach here, but just in case
    throw lastError || new Error('Upload failed after max retries');
}
