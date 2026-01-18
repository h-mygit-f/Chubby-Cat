
export const HeaderTemplate = `
    <!-- HEADER -->
    <div class="header">
        <div class="header-left">
            <button id="history-toggle" class="icon-btn" data-i18n-title="toggleHistory" title="Chat History">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            
            <div class="model-dropdown" id="model-dropdown" data-i18n-title="modelSelectTooltip" title="Select Model (Tab to cycle)">
                <button class="model-dropdown-trigger" id="model-dropdown-trigger" type="button">
                    <span class="model-dropdown-label" id="model-dropdown-label">Fast</span>
                    <svg class="model-dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="model-dropdown-menu" id="model-dropdown-menu">
                    <!-- Options will be populated dynamically -->
                </div>
                <!-- Hidden select for compatibility -->
                <select id="model-select" style="display:none;">
                    <option value="gemini-3-flash">Fast</option>
                </select>
            </div>

            <button id="save-chat-btn" class="icon-btn save-btn" data-i18n-title="saveChatTooltip" title="Save Chat as Markdown">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span class="save-btn-indicator"></span>
            </button>
        </div>

        <div class="header-right">
            <button id="tab-switcher-btn" class="icon-btn" style="display: none;" data-i18n-title="selectTabTooltip" title="Select a tab to control">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 6h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
                    <path d="M2 6l2.5-3.5A2 2 0 0 1 6.1 1h11.8a2 2 0 0 1 1.6 1.5L22 6"/>
                </svg>
            </button>
        </div>
    </div>

    <!-- Corner Button -->
    <button id="open-full-page-btn" class="corner-btn" data-i18n-title="openFullPageTooltip" title="Open in Full Page">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
    </button>
`;