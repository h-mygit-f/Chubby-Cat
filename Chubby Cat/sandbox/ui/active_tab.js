
// sandbox/ui/active_tab.js
import { t } from '../core/i18n.js';
import { sendToBackground } from '../../lib/messaging.js';

export class ActiveTabController {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;

        // Elements
        this.containerEl = null;
        this.displayEl = null;
        this.titleEl = null;
        this.iconEl = null;
        this.dropdown = null;
        this.listEl = null;
        this.selectAllBtn = null;
        this.deselectAllBtn = null;
        this.countEl = null;

        // State
        this.currentTab = null;
        this.allTabs = [];
        this.selectedTabIds = new Set();
        this.importedStats = null; // { count: number, totalChars: number }
        this.isImporting = false;
        this.isOpen = false;
        this.importingTabIds = new Set(); // Track tabs currently being imported

        this.queryElements();
        this.bindEvents();
        this.fetchActiveTabInfo();
    }

    queryElements() {
        this.containerEl = document.getElementById('active-tab-container');
        this.displayEl = document.getElementById('active-tab-display');
        this.titleEl = document.getElementById('active-tab-title');
        this.iconEl = this.displayEl?.querySelector('.active-tab-icon');
        this.dropdown = document.getElementById('multi-tab-dropdown');
        this.listEl = document.getElementById('multi-tab-list');
        this.selectAllBtn = document.getElementById('multi-tab-select-all');
        this.deselectAllBtn = document.getElementById('multi-tab-deselect-all');
        this.countEl = document.getElementById('multi-tab-count');
    }

    bindEvents() {
        // Click on display to toggle dropdown
        if (this.displayEl) {
            this.displayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Select all
        if (this.selectAllBtn) {
            this.selectAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectAll();
            });
        }

        // Deselect all
        if (this.deselectAllBtn) {
            this.deselectAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deselectAll();
            });
        }

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.containerEl && !this.containerEl.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Escape key to close dropdown
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeDropdown();
            }
        });
    }

    fetchActiveTabInfo() {
        // Request initial active tab info
        sendToBackground({ action: "GET_ACTIVE_TAB_INFO" });
    }

    updateActiveTab(tab) {
        if (!tab) return;

        this.currentTab = tab;

        if (this.titleEl) {
            this.titleEl.textContent = tab.title || tab.url || t('activeTab');
        }

        if (this.iconEl && tab.favIconUrl) {
            this.iconEl.innerHTML = '';
            const img = document.createElement('img');
            img.src = tab.favIconUrl;
            img.onerror = () => {
                this.iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 6h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
                    <path d="M2 6l2.5-3.5A2 2 0 0 1 6.1 1h11.8a2 2 0 0 1 1.6 1.5L22 6"/>
                </svg>`;
            };
            this.iconEl.appendChild(img);
        }
    }

    setHasContext(hasContext) {
        if (this.displayEl) {
            this.displayEl.classList.toggle('has-context', hasContext);
        }
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        if (this.containerEl) {
            this.isOpen = true;
            this.containerEl.classList.add('open');
            this.displayEl?.classList.add('open');
            // Fetch all open tabs
            sendToBackground({ action: "GET_OPEN_TABS_FOR_CONTEXT" });
        }
    }

    closeDropdown() {
        if (this.containerEl) {
            this.isOpen = false;
            this.containerEl.classList.remove('open');
            this.displayEl?.classList.remove('open');
        }
    }

    populateTabs(tabs) {
        // Filter out the current active tab - it's controlled by the "网页" button separately
        const currentTabId = this.currentTab ? this.currentTab.id : null;
        this.allTabs = (tabs || []).filter(tab => tab.id !== currentTabId);

        this.renderTabList();
    }

    renderTabList() {
        if (!this.listEl) return;
        this.listEl.innerHTML = '';

        if (this.allTabs.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'multi-tab-empty';
            emptyEl.textContent = t('noTabsFound');
            this.listEl.appendChild(emptyEl);
            return;
        }

        this.allTabs.forEach(tab => {
            const isSelected = this.selectedTabIds.has(tab.id);
            const isLoading = this.importingTabIds.has(tab.id);

            const item = document.createElement('div');
            item.className = `multi-tab-item ${isSelected ? 'selected' : ''} ${isLoading ? 'loading' : ''}`;
            item.dataset.tabId = tab.id;

            // Checkbox
            const checkbox = document.createElement('div');
            checkbox.className = 'multi-tab-checkbox';
            checkbox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>`;

            // Favicon
            const favicon = document.createElement('img');
            favicon.className = 'multi-tab-favicon';
            favicon.src = tab.favIconUrl || '';
            favicon.onerror = () => { favicon.style.display = 'none'; };

            // Info container
            const info = document.createElement('div');
            info.className = 'multi-tab-info';

            const title = document.createElement('div');
            title.className = 'multi-tab-title';
            title.textContent = tab.title || 'Untitled';

            const url = document.createElement('div');
            url.className = 'multi-tab-url';
            try {
                url.textContent = new URL(tab.url).hostname;
            } catch {
                url.textContent = tab.url;
            }

            info.appendChild(title);
            info.appendChild(url);

            item.appendChild(checkbox);
            item.appendChild(favicon);
            item.appendChild(info);

            // Toggle selection on click - selection = import
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isLoading) {
                    this.toggleTabSelection(tab.id);
                }
            });

            this.listEl.appendChild(item);
        });

        this.updateCount();
    }

    toggleTabSelection(tabId) {
        if (this.selectedTabIds.has(tabId)) {
            // Deselect - remove from context
            this.selectedTabIds.delete(tabId);
            this.renderTabList();

            // If all tabs are deselected, reset the context
            if (this.selectedTabIds.size === 0) {
                this.importedStats = null;
                this.setHasContext(false);
                this.updateActiveTab(this.currentTab);

                // Clear multi-tab context from session storage
                sendToBackground({ action: "CLEAR_MULTI_TAB_CONTEXT" });

                // Notify about context cleared
                if (this.callbacks.onContextCleared) {
                    this.callbacks.onContextCleared();
                }
            } else {
                // Re-import remaining selected tabs
                this.importSelectedTabs();
            }
        } else {
            // Select - add to context and import
            this.selectedTabIds.add(tabId);
            this.importTab(tabId);
        }
    }

    selectAll() {
        const previousSize = this.selectedTabIds.size;
        this.allTabs.forEach(tab => {
            this.selectedTabIds.add(tab.id);
        });

        // Only re-import if new tabs were added
        if (this.selectedTabIds.size > previousSize) {
            this.importSelectedTabs();
        }

        this.renderTabList();
    }

    deselectAll() {
        this.selectedTabIds.clear();
        this.importedStats = null;
        this.setHasContext(false);
        this.updateActiveTab(this.currentTab);
        this.renderTabList();

        // Clear multi-tab context from session storage
        sendToBackground({ action: "CLEAR_MULTI_TAB_CONTEXT" });

        // Notify about context cleared
        if (this.callbacks.onContextCleared) {
            this.callbacks.onContextCleared();
        }
    }

    updateCount() {
        const count = this.selectedTabIds.size;

        if (this.countEl) {
            if (count === 0) {
                this.countEl.textContent = t('noTabSelected');
            } else {
                this.countEl.textContent = t('selectedTabsCount').replace('{count}', count);
            }
        }
    }

    /**
     * Import a single tab (when selected)
     */
    importTab(tabId) {
        if (this.importingTabIds.has(tabId)) return;

        this.importingTabIds.add(tabId);
        this.renderTabList();

        // Import all currently selected tabs including the new one
        this.importSelectedTabs();
    }

    /**
     * Import all currently selected tabs
     */
    async importSelectedTabs() {
        if (this.selectedTabIds.size === 0 || this.isImporting) return;

        this.isImporting = true;

        const tabIds = Array.from(this.selectedTabIds);

        // Add all selected tabs to loading state
        tabIds.forEach(id => this.importingTabIds.add(id));
        this.renderTabList();

        // Signal to background to fetch content from selected tabs
        sendToBackground({
            action: "IMPORT_TABS_CONTENT",
            tabIds: tabIds
        });

        // Notify UI about import starting
        if (this.callbacks.onImportStart) {
            this.callbacks.onImportStart(tabIds.length);
        }
    }

    onImportComplete(result) {
        this.isImporting = false;
        this.importingTabIds.clear();
        this.renderTabList();

        // Update stats and context state
        if (result && result.success) {
            this.setImportedStats(result.count || 0, result.totalChars || 0);
            this.setHasContext(true);
        }

        if (this.callbacks.onImportComplete) {
            this.callbacks.onImportComplete(result);
        }
    }

    onImportError(error) {
        this.isImporting = false;
        this.importingTabIds.clear();
        this.renderTabList();

        if (this.callbacks.onImportError) {
            this.callbacks.onImportError(error);
        }
    }

    // Reset the context state (e.g., when starting a new chat)
    resetContext() {
        this.setHasContext(false);
        this.importedStats = null;
        this.selectedTabIds.clear();
        this.importingTabIds.clear();
        // Reset the title display to current tab
        this.updateActiveTab(this.currentTab);
        this.renderTabList();

        // Clear multi-tab context from session storage
        sendToBackground({ action: "CLEAR_MULTI_TAB_CONTEXT" });
    }

    /**
     * Set the imported stats and update the tab display to show the stats
     * @param {number} count - Number of tabs imported
     * @param {number} totalChars - Total character count
     */
    setImportedStats(count, totalChars) {
        this.importedStats = { count, totalChars };

        // Update the title to show stats (same format as pageReadSuccess)
        if (this.titleEl && totalChars > 0) {
            const formatted = new Intl.NumberFormat().format(totalChars);
            this.titleEl.textContent = t('pageReadSuccess').replace('{count}', formatted);
        }
    }

    /**
     * Get the current imported stats
     * @returns {{ count: number, totalChars: number } | null}
     */
    getImportedStats() {
        return this.importedStats;
    }
}
