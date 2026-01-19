
// content/sidebar_icon_styles.js

(function() {
    const SIDEBAR_ICON_STYLES = `
        #chubby-cat-sidebar-icon {
            position: fixed;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            z-index: 2147483646;
            width: 36px;
            height: 48px;
            border-radius: 8px 0 0 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: -2px 2px 8px rgba(102, 126, 234, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: width 0.2s ease, box-shadow 0.2s ease;
            border: none;
            padding: 0;
            outline: none;
            opacity: 0.9;
            user-select: none;
            touch-action: none;
        }

        #chubby-cat-sidebar-icon:hover {
            opacity: 1;
            width: 42px;
            box-shadow: -4px 2px 12px rgba(102, 126, 234, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        #chubby-cat-sidebar-icon:active:not(.dragging) {
            width: 38px;
        }

        #chubby-cat-sidebar-icon.dragging {
            cursor: grabbing;
            opacity: 0.8;
            transition: none;
        }

        #chubby-cat-sidebar-icon img {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            pointer-events: none;
        }

        #chubby-cat-sidebar-icon.loading {
            pointer-events: none;
            opacity: 0.7;
        }

        #chubby-cat-sidebar-icon.loading::after {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid transparent;
            border-top-color: #fff;
            animation: chubby-cat-spin 0.8s linear infinite;
        }

        @keyframes chubby-cat-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* Drag handle indicator */
        #chubby-cat-sidebar-icon::before {
            content: '';
            position: absolute;
            left: 6px;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 16px;
            background: linear-gradient(to bottom,
                rgba(255,255,255,0.4) 0%,
                rgba(255,255,255,0.4) 20%,
                transparent 20%,
                transparent 40%,
                rgba(255,255,255,0.4) 40%,
                rgba(255,255,255,0.4) 60%,
                transparent 60%,
                transparent 80%,
                rgba(255,255,255,0.4) 80%,
                rgba(255,255,255,0.4) 100%
            );
            border-radius: 1px;
            opacity: 0.6;
        }

        /* Tooltip */
        #chubby-cat-sidebar-icon .icon-tooltip {
            position: absolute;
            right: 44px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s, visibility 0.2s;
            pointer-events: none;
        }

        #chubby-cat-sidebar-icon:hover:not(.dragging) .icon-tooltip {
            opacity: 1;
            visibility: visible;
        }

        /* Hide on extension pages and certain restricted pages */
        .chubby-cat-hide-icon #chubby-cat-sidebar-icon {
            display: none !important;
        }
    `;

    // Inject styles
    function injectStyles() {
        if (document.getElementById('chubby-cat-sidebar-icon-styles')) return;

        const style = document.createElement('style');
        style.id = 'chubby-cat-sidebar-icon-styles';
        style.textContent = SIDEBAR_ICON_STYLES;
        (document.head || document.documentElement).appendChild(style);
    }

    // Auto-inject on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyles);
    } else {
        injectStyles();
    }

    // Export for potential reuse
    window.ChubbyCatSidebarIconStyles = { inject: injectStyles };
})();
