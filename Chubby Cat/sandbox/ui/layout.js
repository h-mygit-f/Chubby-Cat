
// sandbox/ui/layout.js
import {
    SidebarTemplate,
    RightSidebarTemplate,
    HeaderTemplate,
    ChatTemplate,
    FooterTemplate,
    ViewerTemplate,
    SettingsTemplate
} from './templates.js';

export function renderLayout() {
    const LayoutTemplate = SidebarTemplate + HeaderTemplate + ChatTemplate + FooterTemplate + RightSidebarTemplate + ViewerTemplate + SettingsTemplate;
    const app = document.getElementById('app');
    if (app) app.innerHTML = LayoutTemplate;
}
