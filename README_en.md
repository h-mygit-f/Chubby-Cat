<div align="center">
  <img src="Chubby%20Cat/logo.png" width="128" height="128" alt="Chubby Cat Logo">
  <h1>Chubby Cat</h1>
  <p><strong>Transform your browser into an intelligent workspace powered by the latest AI models.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Version-1.6.0-blue" alt="Version">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
    <img src="https://img.shields.io/badge/Chrome-Extension-orange" alt="Platform">
  </p>
  
  <p>
    <b>English</b> | <a href="README.md">简体中文</a>
  </p>
</div>

---

## 📖 Project Background and Goals

### Project Background

In today's information-overloaded digital age, users need to handle a massive amount of information retrieval, content reading, and task execution in their browsers every day. Traditional manual browsing methods are inefficient, and existing AI assistant tools are often disconnected from the browser ecosystem, requiring users to frequently switch applications to complete complex workflows.

**Chubby Cat** was created to solve this pain point. As an intelligent assistant based on Chrome extensions, it directly embeds advanced Large Language Model capabilities into the browser's core workflow, enabling a seamless AI collaboration experience of "browsing, thinking, and executing" simultaneously.

### Project Goals

Our core vision is to build a **secure, efficient, and extensible** browser AI workspace:

- **Deep Browser Integration**: Not only reading web page content, but also understanding page structure and executing user intent, truly becoming part of the browser.
- **Unified Multi-Model Access**: Support for Google Gemini, Anthropic Claude, OpenAI-compatible interfaces, and other backends, allowing users to flexibly choose based on their needs.
- **Privacy and Security First**: All data processing is completed locally, API keys are stored only in local storage, strictly protecting user privacy.
- **Powerful Automation Capabilities**: Through Agent mode and MCP protocol integration, AI can perform real browser operations on your behalf.

### Version History

| Version | Major Updates |
| :--- | :--- |
| **v1.6.0** | Chat history export, file attachment support, Gemini model list management, multi-model management optimization, quick phrases panel improvement |
| **v1.5.0** | Grok web support, document OCR processing, storage policy management |
| **v1.4.0** | MCP protocol integration, page summary feature, right sidebar, floating sidebar icon, settings UI refactoring |
| **v1.3.0** | Claude API support, Markdown export, OpenAI/Claude model auto-fetch, MCP server management |
| **v1.2.0** | Markdown rendering optimization, syntax highlighting, LaTeX math formula rendering, fuzzy search support |
| **v1.1.0** | Quick phrases feature, UI optimization |
| **v1.0.0** | Initial release, core chat functionality |

## ✨ Core Features

### 🤖 Unified Model Hub

Support for a wide range of AI backends to suit different performance and cost needs:

| Model Type | Features | Use Cases |
| :--- | :--- | :--- |
| **Google Gemini** | Official API support for Pro/Flash models, free web client with multi-account session rotation | Daily conversation, quick Q&A, cost-sensitive scenarios |
| **Anthropic Claude** | Official API support with Extended Thinking options | Deep reasoning, long-text analysis, complex tasks |
| **xAI Grok** | Web client support (added in v1.5.0) | Specific scenario requirements |
| **OpenAI Compatible** | Connect to any OpenAI-compatible provider (OpenRouter, DeepSeek, Local LLMs, etc.) with customizable Model IDs and Base URLs | Private deployment, multi-model comparison |

### 📄 Intelligent Context Management

- **One-Click Page Context**: Instantly feed the active tab's content into AI for analysis, with smart summary extraction.
- **Multi-Tab Context**: When conducting cross-page research, select multiple open tabs and import their content simultaneously; AI will comprehensively analyze information from multiple sources.
- **Smart Text Selection Toolbar**: A floating toolbar automatically appears when text is selected on the web page, supporting one-click summarize, explain, translate, or continue asking.
- **Quick Ask**: Quickly summon a conversation window via right-click menu or keyboard shortcuts to get immediate answers without opening the sidebar.
- **Page Summary**: AI automatically analyzes current page content and generates structured summaries (added in v1.4.0).

### 👁️ Visual Intelligence Tools

- **High-Precision OCR**: Based on Mistral OCR technology, freely select any area on a webpage to extract text with high accuracy.
- **Smart Snipping**: Capture visual elements and directly use them as prompt input for multi-modal models, supporting complex chart understanding.
- **Screenshot Translation**: Specialized translation tools for handling text embedded in images or complex layouts, preserving original formatting.
- **Document OCR**: Support for full-document OCR processing, extracting text from scanned PDFs and image documents (added in v1.5.0).
- **Local Image Analysis**: Support uploading local images for conversation and recognition, useful for image content Q&A, document scanning, and more.

### 🛠️ Advanced Automation & Extensibility

- **Browser Control (Agent Mode)**: Empower AI to navigate, click, fill forms, and interact with web elements using the Chrome Debugger API, enabling end-to-end automation tasks.
- **MCP Protocol Integration**: Full support for the **Model Context Protocol**, allowing the extension to connect to external tools, local files, and various data sources, significantly expanding AI capabilities (formally integrated in v1.4.0).
- **Prompt Enhancement**: Built-in "Prompt Optimization" feature that significantly improves AI response quality and relevance through deep analysis and structured adjustments.
- **Quick Phrases**: Preset commonly used prompt templates for one-click invocation, improving efficiency for repetitive tasks (introduced in v1.1.0).

### 📦 Data Management

- **Chat History Export**: Support exporting conversation records in Markdown format for easy saving and sharing (added in v1.3.0).
- **Storage Policy Management**: Flexible configuration of data storage policies with automatic cleanup of expired data (added in v1.5.0).
- **File Attachment Support**: Attach files to conversations for analysis and processing (added in v1.6.0).

## 🏗️ Technical Architecture

### Tech Stack Overview

Chubby Cat is built with modern frontend technology stack to ensure high performance, maintainability, and security:

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Build Tool** | Vite 6 | Lightning-fast development experience and optimized production builds |
| **Language** | TypeScript 5.8 | Strong type support, improving code quality and maintainability |
| **UI Framework** | Native DOM + HTML | Lightweight solution, reduced dependencies, faster loading |
| **Markdown Rendering** | Marked.js + KaTeX | Complete Markdown support and math formula rendering (introduced in v1.2.0) |
| **Syntax Highlighting** | Highlight.js | Support for multiple programming languages |
| **State Management** | chrome.storage.local | Local persistent storage for data security |
| **Fuzzy Search** | Fuse.js | Powerful client-side search capability |

### Architecture Design Philosophy

Chubby Cat is developed with the core philosophy of **security, performance, and modularity**, with clear responsibilities and boundaries for each component:

| Component | Core Responsibility |
| :--- | :--- |
| **Background (Service Worker)** | Manages API communication, state persistence, MCP tool loops, and global event orchestration, serving as the extension's "brain" hub. |
| **Sandbox (Secure Sandbox)** | Isolated environment for handling Markdown rendering and complex logic, utilizing Chrome's sandbox mechanism to ensure maximum extension security. |
| **Side Panel** | Provides a persistent and non-intrusive main conversation interface using the Chrome `sidePanel` API, supporting split-screen operation. |
| **Content Scripts** | Responsible for DOM interaction, floating toolbars, gesture recognition, and screenshot capture, serving as the bridge between the extension and web pages. |
| **Bridge Logic** | Robust message-passing system based on Chrome message passing mechanism, ensuring seamless collaboration between all extension components. |

### Message Flow Architecture

```
User Action → Content Script → Background Service Worker → AI API
                                                        ↓
Response ← Sandbox Rendering ← Background Processing ←──┘
                                                        ↓
                                              Update Side Panel / Execute Action
```

### Core Module Structure

```
Chubby Cat/
├── background/           # Service Worker core logic
│   ├── managers/         # Feature managers (session, auth, image, control, etc.)
│   ├── handlers/         # Message handlers (session, UI, quick ask, etc.)
│   ├── control/          # Browser control module (Agent mode)
│   └── lib/              # Utility libraries
├── content/              # Content Scripts
│   ├── toolbar/          # Smart text selection toolbar
│   ├── overlay.js        # Overlay processing
│   ├── selection.js      # Text selection handling
│   └── shortcuts.js      # Keyboard shortcut management
├── sandbox/              # Secure sandbox environment
│   ├── controllers/      # Controller logic
│   ├── core/             # Core feature modules
│   ├── render/           # Renderers (Markdown, messages, config, etc.)
│   └── ui/               # UI components (settings, sidebar, MCP, etc.)
├── sidepanel/            # Sidebar interface
├── services/             # AI service providers
│   └── providers/        # Model API implementations
├── lib/                  # Shared utility libraries
└── tests/                # Test cases
```

## 🚀 Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [Vite](https://vitejs.dev/)
- Chrome browser (v114+) or other Chromium-based browsers (Edge, Brave, etc.)

### Installation Steps

1. **Clone the Project**:

   ```bash
   git clone https://github.com/hallfay0/chubby-cat.git
   cd chubby-cat
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Build the Extension**:

   ```bash
   npm run build
   ```

4. **Load into Chrome**:

   - Open Chrome browser and navigate to `chrome://extensions/`.
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the `dist` folder in your project directory.

### Development Mode

For development and debugging:

```bash
npm run dev
```

In development mode, Vite runs in hot-update mode, automatically refreshing the extension after each code change (click "Reload" on the extension management page).

## 📋 Usage Examples

### Example 1: Web Page Summary

1. Open any long article or research paper.
2. Click the **"Get Page Content"** button in the sidebar, or use the shortcut `Alt+P`.
3. AI will automatically analyze the page structure, extract key information, and generate a summary.
4. View the summary results in the sidebar, with support for further questioning.

### Example 2: Multi-Tab Comprehensive Analysis

1. Open multiple tabs on related topics (e.g., news reports or research reports).
2. Click the tab selector in the sidebar and check the tabs you want to analyze.
3. Click **"Import Selected Tabs"**; AI will comprehensively analyze the content from all tabs.
4. Ask comprehensive questions like "Summarize the main viewpoints and differences in these articles."

### Example 3: Screenshot Translation & OCR

1. Visit a webpage with foreign language images or complex layouts.
2. Click the **screenshot button** on the toolbar, or use the shortcut `Alt+C`.
3. Select the area you want to translate on the webpage.
4. Choose the **"Screenshot Translation"** feature; AI will extract the text and provide translation results.

### Example 4: Automation Task Execution

1. Enable **Agent Mode** in settings and authorize relevant permissions.
2. Enter natural language instructions, such as "Search for React state management libraries on GitHub and open the first three results."
3. AI will automatically navigate, click, and scroll through pages, executing complex multi-step tasks.
4. View execution progress and results in real-time, with support for interruption and adjustment.

### Example 5: Integrating MCP Tools

1. Start a local MCP server (e.g., file system service).
2. Add the MCP server address in settings (e.g., `http://localhost:3000/sse`).
3. Check the tools you want to expose (e.g., "Read File", "List Directory").
4. Send a request like "Read my project README and summarize its main features"; AI will automatically call the relevant tools.

### Example 6: Claude Deep Reasoning

1. Configure Anthropic Claude API in settings.
2. Enable the **"Extended Thinking"** option (for models that support long-form thinking).
3. Ask questions requiring deep reasoning, such as "Analyze the innovations and potential research directions of this paper."
4. Claude will think more deeply and provide more detailed analysis results.

### Example 7: Exporting Chat History

1. After completing a conversation, click the **"Export"** button in the sidebar.
2. Choose the export format (Markdown).
3. Chat history will be saved as a local file, including timestamps, message content, and more.
4. Convenient for saving important conversations, sharing, or future reference.

## ⚙️ Configuration

### 1. API Configuration

Click the extension **Settings** (gear icon) to configure your model source:

#### Google Gemini API

- Visit [Google AI Studio](https://aistudio.google.com/) to register and get an API Key.
- Paste the API Key in settings and select the model version (Pro or Flash).
- Suggestion: Use Flash model for daily conversations to save costs, and Pro model for professional tasks for better results.

#### Anthropic Claude API

- Visit [Anthropic Console](https://console.anthropic.com/) to get an API Key.
- Support for Claude 3.5, Claude 3, and other model versions.
- Optionally enable **Extended Thinking** mode to improve reasoning quality for complex tasks.

#### Custom OpenAI Compatible Interface

- **Base URL**: Enter the interface server address (e.g., `https://api.openrouter.ai/v1`).
- **Model ID**: Enter the model identifier (e.g., `gpt-4o`, `deepseek-chat`).
- **API Key**: Enter the corresponding access key.
- Support for authorization headers and custom request headers.

#### Model Auto-Fetch

- Since v1.3.0, support for automatically fetching available model lists.
- Click "Refresh Model List" to get the latest available models from the API endpoint.

### 2. External MCP Tools Configuration

To extend AI capabilities, you can configure MCP (Model Context Protocol) servers:

1. **Add MCP Server**:
   - Find the "MCP Server" page in settings.
   - Click "Add Server" and enter the server address (e.g., `http://localhost:3000/sse`).

2. **Tool Authorization**:
   - After successful server connection, the list of available tools will be displayed.
   - Check the tools you want to expose to the model.

3. **Usage**:
   - When your request involves related tasks, the model will automatically call these tools.
   - Support for file system access, database queries, API calls, and other extended capabilities.

### 3. Keyboard Shortcut Configuration

Chubby Cat provides rich keyboard shortcut support, customizable in settings:

| Shortcut | Function | Default |
| :--- | :--- | :--- |
| Open Sidebar | Open/close main conversation sidebar | `Alt + S` |
| Quick Screenshot | Start screenshot capture mode | `Alt + C` |
| Get Page Content | Import current page content | `Alt + P` |
| Quick Ask | Open quick ask window | `Alt + Q` |

### 4. Appearance Settings

- **Theme Mode**: Support for light/dark/system-following modes.
- **Language**: Support for Chinese and English interfaces.
- **Font Size**: Adjustable display font size for conversation content.
- **Markdown Rendering**: Option to enable syntax highlighting and math formula rendering (KaTeX).
- **Right Sidebar**: Option to display the right toolbar (added in v1.4.0).

### 5. Storage Management

- **Auto Cleanup**: Set retention duration for conversation history.
- **Data Export**: Export locally stored data at any time.
- **Image Upload**: Configure image processing strategy and storage limits (added in v1.5.0).

## ❓ FAQ

### Q1: What should I do if the sidebar won't open?

You can open the sidebar in the following ways:
- Click the extension icon (cat icon in the browser toolbar).
- Use the shortcut `Alt + S`.

If it still won't open:
- Try restarting Chrome browser.
- Find Chubby Cat on `chrome://extensions/` and click "Reload".
- Check if extension permissions were accidentally disabled.

### Q2: Is my data secure?

Yes, Chubby Cat prioritizes data security:
- **API Keys**: Stored locally in `chrome.storage.local`, never sent to any third-party servers.
- **Conversation Content**: Stored locally by default, with configurable auto-cleanup policies.
- **Web Page Content**: Read page content is only used for current requests and is not persisted or uploaded.
- **Network Transmission**: All API requests communicate directly with your chosen provider without passing through intermediate servers.

### Q3: How does Agent mode ensure security?

Agent mode allows AI to perform browser operations, and we have designed multiple security mechanisms:
- **Permission Control**: Agent mode is off by default and requires explicit authorization on first use.
- **Operation Confirmation**: Dangerous operations (like deletion, form submission) can be configured to require user confirmation.
- **Scope Limits**: Configurable whitelist of websites AI can access.
- **Operation Logs**: All automation operations are recorded and can be viewed or rolled back at any time.

### Q4: Is mobile support available?

Currently **not supported**. Chubby Cat is deeply optimized for desktop Chrome and Chromium-based browsers (Edge, Brave, etc.) because it relies on the following desktop-only APIs:
- `sidePanel` API: Provides persistent sidebar.
- `debugger` API: Enables browser automation control.
- `content_scripts`: Deep DOM injection.

### Q5: Why can't some web pages be read?

The following situations may cause content reading failures:
- **Dynamically Rendered Pages**: Content loaded dynamically via JavaScript may not be fully captured.
- **Cross-Origin Restrictions**: Browser security policies limit access to cross-origin iframes.
- **Anti-Scraping Measures**: Some websites use technical means to prevent automated reading.
- **Solution**: Try using screenshot functionality, or let AI navigate directly in Agent mode.

### Q6: How do I choose the right model?

| Task Type | Recommended Models | Description |
| :--- | :--- | :--- |
| Quick Q&A, Daily Conversation | Gemini Flash / GPT-4o-mini | Fast response, low cost |
| Deep Reasoning, Complex Analysis | Claude 3.5 / Gemini Pro | Strong reasoning, good context understanding |
| Long Text Processing | Claude (Extended Thinking) | Supports ultra-long context and deep thinking |
| Code Generation | Claude 3.5 / GPT-4o | High code quality, multi-language support |
| Translation, OCR | Gemini Flash / Mistral OCR | Fast speed, high accuracy |

### Q7: How do I report issues or suggest features?

We welcome community feedback:
- **GitHub Issues**: Report bugs or submit feature suggestions.
- **Feature Requests**: Describe features you'd like to see and use cases.
- **Documentation Improvements**: Help us improve documentation and examples.

### Q8: What's the difference between free and paid versions?

Chubby Cat is a **free and open-source** product with all features available to all users. The project's operation and maintenance depend on community support. If you find this project helpful, please:
- Star the project on GitHub.
- Share it with friends who might need it.
- Contribute code or documentation.

### Q9: What should I do if model response is slow?

Response speed is affected by multiple factors:
- **API Provider**: Official APIs are usually faster than web clients.
- **Network Environment**: Check network connection or try using a proxy.
- **Model Selection**: Use Pro models for complex tasks, Flash models for simple tasks.
- **Content Size**: Reducing context content speeds up responses.
- **Extended Thinking**: Claude's Extended Thinking mode consumes more computing resources and has longer response times.

### Q10: How can I contribute?

We welcome community contributions:
- **Code Contributions**: Fork the project and submit Pull Requests.
- **Bug Fixes**: Help fix known issues.
- **Feature Development**: Implement new features or improvements.
- **Documentation**: Improve documentation, examples, or translations.
- **Testing**: Write test cases and report issues.

## 🙏 Acknowledgments

This project is modified based on [gemini-nexus](https://github.com/yeahhe365/gemini-nexus). Special thanks to the original author for their open-source contributions.

---

<div align="center">
  <p><i>Empowering your browser with the next generation of AI.</i></p>
</div>
