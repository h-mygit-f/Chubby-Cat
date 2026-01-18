
export const FooterTemplate = `
    <!-- FOOTER -->
    <div class="footer">
        <div id="status"></div>
        
        <!-- Active Tab Display Container with Dropdown -->
        <div class="active-tab-container" id="active-tab-container">
            <!-- Multi-Tab Dropdown Panel (向上展开) -->
            <div class="multi-tab-dropdown" id="multi-tab-dropdown">
                <div class="multi-tab-dropdown-header">
                    <span class="multi-tab-count" id="multi-tab-count" data-i18n="noTabSelected">No tab selected</span>
                    <div class="multi-tab-actions">
                        <button class="multi-tab-action-btn" id="multi-tab-select-all" data-i18n="selectAll">Select All</button>
                        <button class="multi-tab-action-btn" id="multi-tab-deselect-all" data-i18n="deselectAll">Deselect All</button>
                    </div>
                </div>
                <div class="multi-tab-list" id="multi-tab-list"></div>
            </div>
            
            <!-- Active Tab Display Area -->
            <div class="active-tab-display" id="active-tab-display" data-i18n-title="activeTabTooltip" title="Click to select tabs for context import">
                <div class="active-tab-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 6h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
                        <path d="M2 6l2.5-3.5A2 2 0 0 1 6.1 1h11.8a2 2 0 0 1 1.6 1.5L22 6"/>
                    </svg>
                </div>
                <span class="active-tab-title" id="active-tab-title" data-i18n="loadingActiveTab">Loading...</span>
                <div class="active-tab-chevron">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </div>
            </div>
        </div>
        
        <div class="tools-container">
            <button id="tools-scroll-left" class="scroll-nav-btn left" aria-label="Scroll Left">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div class="tools-row" id="tools-row">
                <button id="page-context-btn" class="tool-btn context-aware" data-i18n-title="pageContextTooltip" title="Toggle chat with page content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    <span data-i18n="pageContext">Page</span>
                </button>
                <div class="mcp-servers-wrapper" id="mcp-servers-wrapper">
                    <button id="mcp-toggle-btn" class="tool-btn" data-i18n-title="mcpToggleTooltip" title="Toggle MCP server tools">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path>
                            <circle cx="7.5" cy="17.5" r="1.5"></circle>
                            <circle cx="16.5" cy="17.5" r="1.5"></circle>
                        </svg>
                        <span data-i18n="mcpToggle">MCP</span>
                    </button>
                    
                    <!-- MCP Servers Dropdown Panel -->
                    <div class="mcp-servers-dropdown" id="mcp-servers-dropdown">
                        <div class="mcp-servers-header">
                            <span class="mcp-servers-title" data-i18n="mcpServersTitle">MCP Servers</span>
                            <button class="mcp-servers-settings-btn" id="mcp-servers-settings-btn" data-i18n-title="mcpOpenSettings" title="Open MCP Settings">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="mcp-servers-list" id="mcp-servers-list">
                            <!-- Server items will be dynamically rendered here -->
                        </div>
                        <div class="mcp-servers-empty" id="mcp-servers-empty" data-i18n="mcpNoServers">No MCP servers configured. Open settings to add servers.</div>
                        <div class="mcp-servers-footer">
                            <div class="mcp-servers-count" id="mcp-servers-count"></div>
                        </div>
                    </div>
                </div>
                <button id="quote-btn" class="tool-btn context-aware" data-i18n-title="quoteTooltip" title="Quote selected text from page">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                    </svg>
                    <span data-i18n="quote">Quote</span>
                </button>
                <button id="browser-control-btn" class="tool-btn" data-i18n-title="browserControlTooltip" title="Allow model to control browser">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                        <path d="m13 13 6 6"></path>
                    </svg>
                    <span data-i18n="browserControl">Control</span>
                </button>
                <button id="ocr-btn" class="tool-btn context-aware" data-i18n-title="ocrTooltip" title="Capture area and extract text">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 7V4h3"></path>
                        <path d="M20 7V4h-3"></path>
                        <path d="M4 17v3h3"></path>
                        <path d="M20 17v3h-3"></path>
                        <line x1="9" y1="12" x2="15" y2="12"></line>
                    </svg>
                    <span data-i18n="ocr">OCR</span>
                </button>
                <button id="screenshot-translate-btn" class="tool-btn context-aware" data-i18n-title="screenshotTranslateTooltip" title="Capture area and translate text">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m5 8 6 6"></path><path d="m4 14 6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="m22 22-5-10-5 10"></path><path d="M14 18h6"></path>
                    </svg>
                    <span data-i18n="screenshotTranslate">Translate</span>
                </button>
                <button id="snip-btn" class="tool-btn context-aware" data-i18n-title="snipTooltip" title="Capture area to input">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 2v14a2 2 0 0 0 2 2h14"></path>
                        <path d="M18 22V8a2 2 0 0 0-2-2H2"></path>
                    </svg>
                    <span data-i18n="snip">Snip</span>
                </button>
            </div>

            <button id="tools-scroll-right" class="scroll-nav-btn right" aria-label="Scroll Right">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        </div>

        <div class="input-wrapper">
            <!-- Dynamic Image Preview Container -->
            <div id="image-preview" class="image-preview"></div>
            
            <div class="input-row">
                <!-- New Chat Button -->
                <button id="new-chat-input-btn" class="input-action-btn" data-i18n-title="newChatTooltip" title="New Chat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                
                <!-- Upload File Button -->
                <label id="upload-btn" class="input-action-btn" data-i18n-title="uploadImageTooltip" title="Upload File">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    <input type="file" id="image-input" multiple accept="image/*, .pdf, .txt, .js, .py, .html, .css, .json, .csv, .md" style="display: none;">
                </label>
                
                <!-- Quick Phrases Button with Dropdown -->
                <div class="quick-phrases-wrapper" id="quick-phrases-wrapper">
                    <button id="quick-phrases-btn" class="input-action-btn" data-i18n-title="quickPhrasesTooltip" title="Quick Phrases">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    </button>
                    
                    <!-- Quick Phrases Dropdown Panel -->
                    <div class="quick-phrases-dropdown" id="quick-phrases-dropdown">
                        <div class="quick-phrases-header">
                            <span class="quick-phrases-title" data-i18n="quickPhrases">Quick Phrases</span>
                            <button class="quick-phrases-add-btn" id="quick-phrases-add-btn" data-i18n-title="addQuickPhrase" title="Add Quick Phrase">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>
                        <div class="quick-phrases-list" id="quick-phrases-list">
                            <!-- Quick phrase items will be dynamically rendered here -->
                        </div>
                        <div class="quick-phrases-empty" id="quick-phrases-empty" data-i18n="noQuickPhrases">No quick phrases yet. Click + to add one.</div>
                        
                        <!-- Add/Edit Modal -->
                        <div class="quick-phrase-modal" id="quick-phrase-modal">
                            <div class="quick-phrase-modal-header">
                                <span class="quick-phrase-modal-title" id="quick-phrase-modal-title" data-i18n="addQuickPhrase">Add Quick Phrase</span>
                                <button class="quick-phrase-modal-close" id="quick-phrase-modal-close">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div class="quick-phrase-modal-body">
                                <input type="text" id="quick-phrase-input" class="quick-phrase-text-input" data-i18n-placeholder="quickPhrasePlaceholder" placeholder="Enter your quick phrase...">
                            </div>
                            <div class="quick-phrase-modal-footer">
                                <button class="quick-phrase-cancel-btn" id="quick-phrase-cancel-btn" data-i18n="cancel">Cancel</button>
                                <button class="quick-phrase-save-btn" id="quick-phrase-save-btn" data-i18n="save">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
                <textarea id="prompt" data-i18n-placeholder="askPlaceholder" placeholder="Ask Gemini..." rows="1"></textarea>
                <button id="send" data-i18n-title="sendMessageTooltip" title="Send message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
        </div>
    </div>
`;