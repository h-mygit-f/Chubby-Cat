<div align="center">
  <img src="logo.png" width="128" height="128" alt="Chubby Cat Logo">
  <h1>Chubby Cat</h1>
  <p><strong>Transform your browser into an intelligent workspace powered by the latest AI models.</strong></p>

  <p>
    <b>English</b> | <a href="README.md">简体中文</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Version-1.1.0-blue" alt="Version">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
    <img src="https://img.shields.io/badge/Chrome-Extension-orange" alt="Platform">
  </p>
</div>

---

## 🌟 Overview

**Chubby Cat** is a state-of-the-art Chrome Extension that seamlessly integrates Large Language Models (LLMs) directly into your browsing experience. Unlike standard chat interfaces, Chubby Cat is deeply integrated with your browser's ecosystem, allowing it to see what you see, read what you read, and even perform actions on your behalf.

Whether you're summarizing research papers, translating foreign sites, extracting data via OCR, or automating repetitive tasks, Chubby Cat provides a unified, powerful, and secure interface for all your AI needs.

## ✨ Core Features

### 🤖 Unified Model Hub
Support for a wide range of AI backends to suit your performance and cost needs:
- **Gemini Web Interface**: Use the official Gemini web client for free, with advanced features like multi-account session rotation.
- **Official API Support**: Direct integration with Google Gemini Pro and Flash models via official API keys.
- **Custom OpenAI Endpoints**: Connect to any OpenAI-compatible provider (OpenRouter, DeepSeek, Local LLMs, etc.) with customizable Model IDs and Base URLs.

### 📄 Intelligent Context Management
- **One-Click Page Context**: Instantly feed the active tab's content into the AI.
- **Multi-Tab Context**: Select and import content from multiple open tabs simultaneously for cross-page research.
- **Smart Text Selection**: A non-intrusive floating toolbar appears upon text selection for instant 1-click actions (Summarize, Explain, Translate).

### 👁️ Visual Intelligence Tools
- **Precision OCR**: Select any area on a webpage to extract text with high accuracy.
- **Smart Snipping**: Capture any visual element and immediately use it as a prompt input for multi-modal models.
- **Screenshot Translation**: Specialized tools for translating text directly within images or complex layouts.
- **Multi-modal Uploads**: Support for local image uploads and analysis.

### 🛠️ Advanced Automation & Extensibility
- **Browser Control (Agentic Mode)**: Empower the AI to navigate, click, and interact with web elements using the Chrome Debugger API.
- **MCP integration**: Full support for the **Model Context Protocol**, allowing the extension to connect to external tools, local files, and data sources.
- **Enhanced Prompting**: Built-in "Enhance Prompt" feature to refine and optimize your queries for better AI responses.

## 🏗️ Technical Architecture

Chubby Cat is built with a focus on security, performance, and modularity:

| Component | Responsibility |
| :--- | :--- |
| **Background (Service Worker)** | Manages API communication, state persistence, MCP tool loops, and global event orchestration. |
| **Sandbox (Secure Iframe)** | Isolated environment for handling Markdown rendering and complex logic processing to ensure maximum security. |
| **Side Panel** | The main conversational UI, leveraging the Chrome `sidePanel` API for a persistent and non-intrusive experience. |
| **Content Scripts** | Responsible for DOM interaction, floating toolbars, gesture recognition, and screenshot capture. |
| **Bridge Logic** | Robust message-passing system ensuring seamless communication between all extension components. |

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [Vite](https://vitejs.dev/)

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
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the `dist` folder in your project directory.

## ⚙️ Configuration

### 1. API Configuration
Open the extension **Settings** (gear icon) to configure your preferred model source:
- **Official Gemini**: Obtain an API Key from [Google AI Studio](https://aistudio.google.com/).
- **Custom API**: Enter the Base URL and Model ID (e.g., `https://api.openai.com/v1`, `gpt-4o`).

### 2. External MCP Tools
To extend the AI's capabilities:
- Connect to an MCP server (e.g., `http://localhost:3000/sse`).
- Select which tools to expose to the model.
- The model will automatically call these tools when relevant to your request.

## 💬 FAQ

### Q: Why isn't the side panel opening?
The side panel can be opened by clicking the extension icon or using the shortcut `Alt + S`. If it still won't open, try restarting your browser or reloading the extension.

### Q: Is my data secure?
Yes. Chubby Cat communicates directly with your chosen API providers. Your API keys are stored locally on your device using `chrome.storage.local` and are never sent to our servers.

### Q: Does it support mobile?
Currently, Chubby Cat is optimized for Desktop Chrome and Chromium-based browsers (Edge, Brave, etc.) due to its reliance on the `sidePanel` and `debugger` APIs.

## 🙏 Acknowledgments

This project is modified based on [gemini-nexus](https://github.com/yeahhe365/gemini-nexus). Special thanks to the original author for their open-source contributions.

---

<div align="center">
  <p><i>Empowering your browser with the next generation of AI.</i></p>
</div>
