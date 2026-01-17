
// sandbox/ui/mcp_servers.js
import { t } from '../core/i18n.js';
import { saveConnectionSettingsToStorage } from '../../lib/messaging.js';

/**
 * MCP Servers Selector Controller
 * Provides a dropdown interface to view and toggle individual MCP servers
 */
export class McpServersController {
    constructor(options = {}) {
        this.isOpen = false;
        this.settingsController = options.settingsController || null;

        // DOM Elements
        this.wrapper = null;
        this.toggleBtn = null;
        this.dropdown = null;
        this.serversList = null;
        this.emptyState = null;
        this.countEl = null;
        this.settingsBtn = null;

        this.init();
    }

    init() {
        this.wrapper = document.getElementById('mcp-servers-wrapper');
        this.toggleBtn = document.getElementById('mcp-toggle-btn');
        this.dropdown = document.getElementById('mcp-servers-dropdown');
        this.serversList = document.getElementById('mcp-servers-list');
        this.emptyState = document.getElementById('mcp-servers-empty');
        this.countEl = document.getElementById('mcp-servers-count');
        this.settingsBtn = document.getElementById('mcp-servers-settings-btn');

        if (this.wrapper && this.toggleBtn) {
            this.bindEvents();
        }
    }

    setSettingsController(controller) {
        this.settingsController = controller;
    }

    bindEvents() {
        // Toggle dropdown on button click
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Settings button - open settings panel
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
                this.openSettings();
            });
        }


        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.wrapper && this.dropdown) {
                // Check if click is outside both wrapper and dropdown
                if (!this.wrapper.contains(e.target) && !this.dropdown.contains(e.target)) {
                    this.close();
                }
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (!this.wrapper || !this.dropdown || !this.toggleBtn) return;
        this.isOpen = true;
        this.wrapper.classList.add('open');

        // Calculate position for fixed dropdown (appears above the button)
        this.positionDropdown();

        this.render();
    }

    /**
     * Position the dropdown above the toggle button using fixed positioning
     */
    positionDropdown() {
        if (!this.dropdown || !this.toggleBtn) return;

        const btnRect = this.toggleBtn.getBoundingClientRect();
        const dropdownWidth = Math.min(320, window.innerWidth - 40);

        // Position above the button
        const top = btnRect.top - 8; // 8px gap above button
        let left = btnRect.left + (btnRect.width / 2) - (dropdownWidth / 2);

        // Ensure it stays within viewport
        if (left < 10) left = 10;
        if (left + dropdownWidth > window.innerWidth - 10) {
            left = window.innerWidth - dropdownWidth - 10;
        }

        this.dropdown.style.width = `${dropdownWidth}px`;
        this.dropdown.style.left = `${left}px`;
        this.dropdown.style.bottom = `${window.innerHeight - top}px`;
    }

    close() {
        if (!this.wrapper) return;
        this.isOpen = false;
        this.wrapper.classList.remove('open');
    }

    openSettings() {
        if (this.settingsController && typeof this.settingsController.open === 'function') {
            this.settingsController.open();
        }
    }

    /**
     * Get connection data from settings controller
     */
    getConnectionData() {
        if (this.settingsController && this.settingsController.connectionData) {
            return this.settingsController.connectionData;
        }
        return null;
    }

    /**
     * Render the servers list
     */
    render() {
        const connectionData = this.getConnectionData();

        if (!connectionData || !this.serversList) {
            this.showEmptyState(true);
            this.updateCount(0, 0);
            this.updateButtonState(false);
            return;
        }

        const servers = Array.isArray(connectionData.mcpServers) ? connectionData.mcpServers : [];
        const activeIds = new Set(
            Array.isArray(connectionData.mcpActiveServerIds) ? connectionData.mcpActiveServerIds : []
        );

        if (servers.length === 0) {
            this.showEmptyState(true);
            this.updateCount(0, 0);
            this.updateButtonState(false);
            return;
        }

        this.showEmptyState(false);
        this.serversList.innerHTML = '';

        let activeCount = 0;

        servers.forEach((server) => {
            const isActive = activeIds.has(server.id) && connectionData.mcpEnabled === true;
            if (isActive) activeCount++;

            const item = this.createServerItem(server, isActive);
            this.serversList.appendChild(item);
        });

        this.updateCount(activeCount, servers.length);
        this.updateButtonState(activeCount > 0);
    }

    /**
     * Create a server item element
     */
    createServerItem(server, isActive) {
        const item = document.createElement('div');
        item.className = `mcp-server-item${isActive ? ' active' : ''}`;
        item.dataset.serverId = server.id;

        // Status indicator
        const status = document.createElement('div');
        status.className = 'mcp-server-status';

        // Server info
        const info = document.createElement('div');
        info.className = 'mcp-server-info';

        const name = document.createElement('div');
        name.className = 'mcp-server-name';
        name.textContent = server.name || 'MCP Server';

        const url = document.createElement('div');
        url.className = 'mcp-server-url';
        url.textContent = server.url || 'No URL configured';

        info.appendChild(name);
        info.appendChild(url);

        // Toggle switch
        const toggle = document.createElement('label');
        toggle.className = 'mcp-server-toggle';
        toggle.onclick = (e) => e.stopPropagation(); // Prevent item click

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isActive;
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleServer(server.id, e.target.checked);
        });

        const slider = document.createElement('span');
        slider.className = 'mcp-server-toggle-slider';

        toggle.appendChild(checkbox);
        toggle.appendChild(slider);

        // Assemble item
        item.appendChild(status);
        item.appendChild(info);
        item.appendChild(toggle);

        // Click on item also toggles
        item.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            this.toggleServer(server.id, checkbox.checked);
        });

        return item;
    }

    /**
     * Toggle a specific server's active state
     */
    toggleServer(serverId, enabled) {
        const connectionData = this.getConnectionData();
        if (!connectionData) return;

        let activeIds = Array.isArray(connectionData.mcpActiveServerIds)
            ? [...connectionData.mcpActiveServerIds]
            : [];

        if (enabled) {
            // Add server to active list
            if (!activeIds.includes(serverId)) {
                activeIds.push(serverId);
            }
            // Also ensure mcpEnabled is true when activating a server
            connectionData.mcpEnabled = true;
        } else {
            // Remove server from active list
            activeIds = activeIds.filter(id => id !== serverId);
            // If no servers are active, optionally disable MCP
            if (activeIds.length === 0) {
                connectionData.mcpEnabled = false;
            }
        }

        connectionData.mcpActiveServerIds = activeIds;

        // Update legacy field for backwards compatibility
        connectionData.mcpActiveServerId = activeIds[0] || null;

        // Save to storage
        if (this.settingsController) {
            this.settingsController.connectionData = connectionData;
        }
        saveConnectionSettingsToStorage(connectionData);

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('mcp-settings-changed', {
            detail: {
                mcpEnabled: connectionData.mcpEnabled,
                activeServerIds: activeIds
            }
        }));

        // Re-render
        this.render();
    }

    /**
     * Show/hide empty state
     */
    showEmptyState(show) {
        if (this.emptyState) {
            this.emptyState.style.display = show ? 'block' : 'none';
        }
        if (this.serversList) {
            this.serversList.style.display = show ? 'none' : 'block';
        }
    }

    /**
     * Update the count display
     */
    updateCount(active, total) {
        if (this.countEl) {
            if (total === 0) {
                this.countEl.textContent = t('mcpNoServersConfigured');
            } else if (active === 0) {
                this.countEl.textContent = t('mcpServersInactive').replace('{total}', total);
            } else {
                this.countEl.textContent = t('mcpServersActive')
                    .replace('{active}', active)
                    .replace('{total}', total);
            }
        }
    }

    /**
     * Update button state to indicate if any servers are active
     */
    updateButtonState(hasActive) {
        if (this.wrapper) {
            this.wrapper.classList.toggle('has-active', hasActive);
        }
    }

    /**
     * Sync state from settings (called when settings are restored)
     */
    syncFromSettings() {
        const connectionData = this.getConnectionData();
        if (!connectionData) {
            this.updateButtonState(false);
            return;
        }

        const servers = Array.isArray(connectionData.mcpServers) ? connectionData.mcpServers : [];
        const activeIds = Array.isArray(connectionData.mcpActiveServerIds) ? connectionData.mcpActiveServerIds : [];
        const hasActive = connectionData.mcpEnabled === true && activeIds.length > 0 && servers.length > 0;

        this.updateButtonState(hasActive);
    }
}
