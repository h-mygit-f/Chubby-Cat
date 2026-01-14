<div align="center">
  <img src="logo.png" width="128" height="128" alt="Chubby Cat Logo">
  <h1>Chubby Cat</h1>
  <p><strong>将您的浏览器转化为由最新 AI 模型驱动的智能工作空间。</strong></p>

  <p>
    <img src="https://img.shields.io/badge/版本-1.0.0-blue" alt="Version">
    <img src="https://img.shields.io/badge/许可-MIT-green" alt="License">
    <img src="https://img.shields.io/badge/平台-Chrome_扩展-orange" alt="Platform">
  </p>
  
  <p>
    <a href="README_en.md">English</a> | <b>简体中文</b>
  </p>
</div>

---

## 🌟 项目概述

**Chubby Cat** 是一款尖端的 Chrome 浏览器扩展程序，旨在将大语言模型 (LLMs) 无缝集成到您的日常浏览体验中。不同于普通的聊天界面，Chubby Cat 与浏览器生态深度融合，能够感知您正在浏览的内容，阅读网页信息，甚至代表您执行复杂的浏览器操作。

无论是总结学术论文、翻译外文网站、通过 OCR 提取图像数据，还是自动化重复性任务，Chubby Cat 都能为您提供统一、高效且安全的 AI 交互界面。

## ✨ 核心功能

### 🤖 统一模型枢纽
支持多种 AI 后端，满足不同场景下的性能与成本需求：
- **Gemini 网页端**: 免费使用官方 Gemini 网页版，支持多账号会话轮询（Session Rotation）。
- **官方 API 支持**: 直接集成 Google Gemini Pro 和 Flash 模型，提供极速响应。
- **自定义 OpenAI 兼容接口**: 连接至任何 OpenAI 兼容的提供商（如 OpenRouter, DeepSeek, 本地 LLM 等），支持自定义模型 ID 和 Base URL。

### 📄 智能上下文管理
- **一键网页上下文**: 瞬间将当前活动标签页的内容喂给 AI 进行分析。
- **多标签页关联**: 跨页面研究时，可勾选多个打开的标签页并同时导入其内容。
- **智能划词工具栏**: 选中网页文本时自动弹出悬浮工具栏，支持一键总结、解释或翻译。

### 👁️ 视觉智能工具
- **高精度 OCR**: 自由框选网页任何区域，精准提取文字内容。
- **智能截图输入**: 捕捉视觉元素并直接作为多模态模型的提示词输入。
- **截图翻译**: 专为处理图像内嵌文字或复杂排版设计的翻译工具。
- **本地图片分析**: 支持上传本地图片进行对话与识别。

### 🛠️ 高级自动化与扩展
- **浏览器控制 (Agent 模式)**: 授权 AI 通过 Chrome Debugger API 进行导航、点击及与网页元素交互。
- **MCP 协议集成**: 全面支持 **Model Context Protocol**，允许扩展连接外部工具、本地文件及各类数据源。
- **提示词增益**: 内置“提示词优化”功能，通过深度分析和结构化调整，显著提升 AI 回答质量。

## 🏗️ 技术架构

Chubby Cat 开发的核心理念是安全、性能与模块化：

| 组件 | 核心职责 |
| :--- | :--- |
| **Background (Service Worker)** | 管理 API 通信、状态持久化、MCP 工具循环及全局事件调度。 |
| **Sandbox (安全沙箱)** | 隔离环境下处理 Markdown 渲染与复杂逻辑，确保扩展的最高安全性。 |
| **Side Panel (侧边栏)** | 利用 Chrome `sidePanel` API 提供持久且不干扰阅读的主对话界面。 |
| **Content Scripts** | 负责 DOM 交互、悬浮工具栏、手势识别及屏幕截图捕获。 |
| **Bridge Logic** | 健壮的消息传递系统，确保扩展各组件间的无缝协作。 |

## 🚀 安装与启动

### 环境要求
- [Node.js](https://nodejs.org/) (v18.0 或更高版本)
- [Vite](https://vitejs.dev/)

### 安装步骤
1. **克隆项目**:
   ```bash
   git clone https://github.com/hallfay0/chubby-cat.git
   cd chubby-cat
   ```

2. **安装依赖**:
   ```bash
   npm install
   ```

3. **构建扩展**:
   ```bash
   npm run build
   ```

4. **加载到 Chrome**:
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`。
   - 开启右上角的 **开发者模式**。
   - 点击 **加载已解压的扩展程序**，选择项目目录下的 `dist` 文件夹。

## ⚙️ 配置说明

### 1. API 配置
点击扩展程序中的 **设置**（齿轮图标）配置您的模型来源：
- **官方 Gemini**: 从 [Google AI Studio](https://aistudio.google.com/) 获取 API Key。
- **自定义 API**: 输入接口地址 (Base URL) 和模型 ID (Model ID)。

### 2. 外部 MCP 工具
如需扩展 AI 的能力：
- 连接至 MCP 服务器（例如 `http://localhost:3000/sse`）。
- 在设置中勾选需要暴露给模型使用的工具。
- 当您的请求涉及相关任务时，模型将自动调用这些工具。

## 💬 常见问题 (FAQ)

### Q: 侧边栏无法打开怎么办？
您可以通过点击扩展图标或使用快捷键 `Alt + S` 弹出侧边栏。如果失效，请尝试重启浏览器或重新加载扩展。

### Q: 我的数据安全吗？
是的。Chubby Cat 直接与您选择的 API 提供商通信。您的 API Key 保存在本地的 `chrome.storage.local` 中，绝不会发送给任何第三方服务器。

### Q: 支持移动端吗？
目前 Chubby Cat 针对桌面端 Chrome 及 Chromium 内核浏览器（Edge, Brave 等）进行了优化，因为它依赖于 `sidePanel` 和 `debugger` 等桌面端专用 API。

## 🙏 鸣谢

本项目基于 [gemini-nexus](https://github.com/yeahhe365/gemini-nexus) 修改，感谢原作者的开源贡献。

---

<div align="center">
  <p><i>用下一代 AI 技术赋能您的浏览器。</i></p>
</div>
