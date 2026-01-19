
// content/sidebar_icon.js

(function() {
    'use strict';

    const ICON_ID = 'chubby-cat-sidebar-icon';
    const STORAGE_KEY = 'geminiSidebarIconPosition';
    const DEBOUNCE_MS = 300;
    const DRAG_THRESHOLD = 5; // pixels to move before considered a drag

    // Check if extension context is still valid
    function isContextValid() {
        try {
            return !!chrome.runtime?.id;
        } catch {
            return false;
        }
    }

    class SidebarIcon {
        constructor() {
            this.iconElement = null;
            this.lastClickTime = 0;
            this.isLoading = false;

            // Drag state
            this.isDragging = false;
            this.dragStartY = 0;
            this.iconStartTop = 0;
            this.hasMoved = false;

            // Bound handlers for cleanup
            this._boundMouseMove = this._handleMouseMove.bind(this);
            this._boundMouseUp = this._handleMouseUp.bind(this);
            this._boundTouchMove = this._handleTouchMove.bind(this);
            this._boundTouchEnd = this._handleTouchEnd.bind(this);
        }

        init() {
            // Skip on restricted pages
            if (this._isRestrictedPage()) {
                return;
            }

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this._createIcon());
            } else {
                this._createIcon();
            }

            // Listen for messages from background
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (!isContextValid()) {
                    return false;
                }
                if (request.action === 'SIDEBAR_ICON_LOADING') {
                    this._setLoading(request.loading);
                }
                return false;
            });
        }

        _isRestrictedPage() {
            const url = window.location.href;
            return (
                url.startsWith('chrome://') ||
                url.startsWith('chrome-extension://') ||
                url.startsWith('edge://') ||
                url.startsWith('about:') ||
                url.startsWith('view-source:') ||
                url.startsWith('devtools://') ||
                url.startsWith('https://chrome.google.com/webstore') ||
                url.startsWith('https://chromewebstore.google.com')
            );
        }

        _createIcon() {
            // Check context before using chrome APIs
            if (!isContextValid()) {
                return;
            }

            // Avoid duplicate
            if (document.getElementById(ICON_ID)) {
                this.iconElement = document.getElementById(ICON_ID);
                this._restorePosition();
                return;
            }

            const icon = document.createElement('button');
            icon.id = ICON_ID;
            icon.setAttribute('aria-label', 'Summarize this page with Chubby Cat');

            // Use extension logo
            const logoUrl = chrome.runtime.getURL('logo.png');
            const img = document.createElement('img');
            img.src = logoUrl;
            img.alt = 'Chubby Cat';
            icon.appendChild(img);

            // Add tooltip element
            const tooltip = document.createElement('span');
            tooltip.className = 'icon-tooltip';
            tooltip.textContent = '总结此网页';
            icon.appendChild(tooltip);

            // Mouse events
            icon.addEventListener('mousedown', (e) => this._handleMouseDown(e));
            icon.addEventListener('click', (e) => this._handleClick(e));

            // Touch events for mobile
            icon.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });

            // Append to body
            document.body.appendChild(icon);
            this.iconElement = icon;

            // Restore saved position
            this._restorePosition();
        }

        _handleMouseDown(e) {
            if (e.button !== 0) return; // Only left click

            this.dragStartY = e.clientY;
            this.iconStartTop = this._getCurrentTop();
            this.hasMoved = false;

            document.addEventListener('mousemove', this._boundMouseMove);
            document.addEventListener('mouseup', this._boundMouseUp);
        }

        _handleMouseMove(e) {
            const deltaY = e.clientY - this.dragStartY;

            if (!this.isDragging && Math.abs(deltaY) > DRAG_THRESHOLD) {
                this.isDragging = true;
                this.hasMoved = true;
                this.iconElement.classList.add('dragging');
            }

            if (this.isDragging) {
                e.preventDefault();
                this._updatePosition(this.iconStartTop + deltaY);
            }
        }

        _handleMouseUp(e) {
            document.removeEventListener('mousemove', this._boundMouseMove);
            document.removeEventListener('mouseup', this._boundMouseUp);

            if (this.isDragging) {
                this.isDragging = false;
                this.iconElement.classList.remove('dragging');
                this._savePosition();
            }
        }

        _handleTouchStart(e) {
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];
            this.dragStartY = touch.clientY;
            this.iconStartTop = this._getCurrentTop();
            this.hasMoved = false;

            document.addEventListener('touchmove', this._boundTouchMove, { passive: false });
            document.addEventListener('touchend', this._boundTouchEnd);
        }

        _handleTouchMove(e) {
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];
            const deltaY = touch.clientY - this.dragStartY;

            if (!this.isDragging && Math.abs(deltaY) > DRAG_THRESHOLD) {
                this.isDragging = true;
                this.hasMoved = true;
                this.iconElement.classList.add('dragging');
            }

            if (this.isDragging) {
                e.preventDefault();
                this._updatePosition(this.iconStartTop + deltaY);
            }
        }

        _handleTouchEnd(e) {
            document.removeEventListener('touchmove', this._boundTouchMove);
            document.removeEventListener('touchend', this._boundTouchEnd);

            if (this.isDragging) {
                this.isDragging = false;
                this.iconElement.classList.remove('dragging');
                this._savePosition();
            }
        }

        _getCurrentTop() {
            if (!this.iconElement) return window.innerHeight / 2;

            const style = window.getComputedStyle(this.iconElement);
            const top = parseFloat(style.top);

            // If using transform translateY(-50%), the actual center is at top
            return isNaN(top) ? window.innerHeight / 2 : top;
        }

        _updatePosition(newTop) {
            if (!this.iconElement) return;

            // Clamp to viewport bounds
            const iconHeight = this.iconElement.offsetHeight || 48;
            const minTop = iconHeight / 2;
            const maxTop = window.innerHeight - iconHeight / 2;

            newTop = Math.max(minTop, Math.min(maxTop, newTop));

            this.iconElement.style.top = `${newTop}px`;
            this.iconElement.style.transform = 'translateY(-50%)';
        }

        _savePosition() {
            if (!this.iconElement || !isContextValid()) return;

            const top = this._getCurrentTop();
            const positionPercent = (top / window.innerHeight) * 100;

            // Save as percentage of viewport height for responsive behavior
            chrome.storage.local.set({
                [STORAGE_KEY]: positionPercent
            }).catch(() => {});
        }

        _restorePosition() {
            if (!isContextValid()) return;

            chrome.storage.local.get([STORAGE_KEY], (result) => {
                if (result[STORAGE_KEY] !== undefined && this.iconElement) {
                    const positionPercent = result[STORAGE_KEY];
                    const top = (positionPercent / 100) * window.innerHeight;
                    this._updatePosition(top);
                }
            });
        }

        _handleClick(e) {
            // If we just finished dragging, don't trigger click
            if (this.hasMoved) {
                e.preventDefault();
                e.stopPropagation();
                this.hasMoved = false;
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Debounce
            const now = Date.now();
            if (now - this.lastClickTime < DEBOUNCE_MS) {
                return;
            }
            this.lastClickTime = now;

            if (this.isLoading) {
                return;
            }

            this._setLoading(true);

            // Check if extension context is still valid
            if (!isContextValid()) {
                console.warn('[Chubby Cat] Extension context invalidated, please refresh the page');
                this._setLoading(false);
                this.destroy();
                return;
            }

            // Send message to background to open sidepanel with summary
            chrome.runtime.sendMessage({
                action: 'OPEN_SIDE_PANEL_WITH_SUMMARY'
            }).then(() => {
                // Loading state will be cleared by background response
                // Set a timeout fallback in case background doesn't respond
                setTimeout(() => {
                    this._setLoading(false);
                }, 5000);
            }).catch((err) => {
                // Handle extension context invalidated error
                if (err.message?.includes('Extension context invalidated')) {
                    console.warn('[Chubby Cat] Extension reloaded, cleaning up');
                    this.destroy();
                    return;
                }
                console.warn('[Chubby Cat] Failed to send message:', err);
                this._setLoading(false);
            });
        }

        _setLoading(loading) {
            this.isLoading = loading;
            if (this.iconElement) {
                if (loading) {
                    this.iconElement.classList.add('loading');
                } else {
                    this.iconElement.classList.remove('loading');
                }
            }
        }

        destroy() {
            document.removeEventListener('mousemove', this._boundMouseMove);
            document.removeEventListener('mouseup', this._boundMouseUp);
            document.removeEventListener('touchmove', this._boundTouchMove);
            document.removeEventListener('touchend', this._boundTouchEnd);

            if (this.iconElement && this.iconElement.parentNode) {
                this.iconElement.parentNode.removeChild(this.iconElement);
            }
            this.iconElement = null;
        }
    }

    // Initialize
    const sidebarIcon = new SidebarIcon();
    sidebarIcon.init();

    // Export for potential external use
    window.ChubbyCatSidebarIcon = sidebarIcon;
})();
