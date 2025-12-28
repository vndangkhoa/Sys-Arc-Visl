# 🔮 KV-Graph

**AI-Powered Diagram Editor** — Transform ideas into beautiful, interactive flowcharts using natural language, images, or Mermaid code.

![KV-Graph Demo](./public/demo.gif)

## ✨ Features

- **🤖 AI-Powered Generation** — Generates complex diagrams from text prompts using **Llama 3** (local browser) or Cloud AI.
- **👁️ Vision-to-Diagram** — **Florence-2** powered analysis converts screenshots and sketches into editable layouts entirely in the browser.
- **🖌️ Unified Toolkit** — A clean, consolidated toolbar for critical actions (Zoom, Layout, Pan/Select) keeps the canvas "void-like".
- **🗺️ MiniMap Overlay** — Navigational aid for large diagrams, unobtrusively positioned in the bottom-right.
- **💡 Smart Guidance** — Context-aware tips and rotation suggestions when looking at empty space.
- **📝 Theme-Aware Code Editor** — Monaco editor that automatically syncs with your Light/Dark aesthetic.
- **🎨 "Void" Aesthetic** — Premium glassmorphism design with deep blur effects and cinematic transitions.
- **⏪ Undo/Redo** — Full history support with time-travel capabilities for safe editing.
- **📐 Optimized Layout** — Enhanced Dagre layout engine with smart spacing to prevent overlapping text.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- WebGPU-compatible browser (Chrome 113+, Edge) for In-Browser AI

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/kv-graph.git
cd kv-graph

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🧠 AI Configuration

KV-Graph supports a **Local-First** AI architecture, running powerful models directly in your browser via WebGPU.

### 🌐 In-Browser Mode (Privacy First)
Runs entirely on your device. No data leaves your machine.

| Capability | Model | Technology |
|------------|-------|------------|
| **Text Generation** | Llama-3-8B-Instruct | WebLLM (WebGPU) |
| **Vision Analysis** | Florence-2-base | Transformers.js (ONNX) |

*Note: First-time load requires downloading model weights (~4GB total).*

### ☁️ Cloud Mode (Optional)
Connect to external providers for enhanced capabilities.

| Provider | Model | API Key Required |
|----------|-------|------------------|
| OpenAI | GPT-4 Vision | ✅ |
| Google Gemini | Gemini Pro Vision | ✅ |
| Ollama | Custom | Local URL |

Configure your AI provider in **Settings** (⚙️ icon).

## 🐳 Docker Support

Run KV-Graph locally using Docker:

```bash
docker-compose up -d
```

Open [http://localhost:8338](http://localhost:8338) in your browser.

## 📁 Project Structure

```
kv-graph/
├── src/
│   ├── components/        # React components
│   │   ├── nodes/         # Custom React Flow nodes
│   │   ├── edges/         # Custom React Flow edges
│   │   ├── editor/        # Monaco Code Editor
│   │   └── ui/            # UI Kit (Glassware)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Core Logic
│   │   ├── aiService.ts   # AI Orchestrator
│   │   ├── webLlmService.ts # Local LLM Engine
│   │   ├── visionService.ts # Local Vision Engine
│   │   └── layoutEngine.ts # Dagre Auto-Layout
│   ├── pages/             # Route pages
│   ├── store/             # Zustand Global State
│   │   ├── flowStore.ts     # Combined Flow State
│   │   └── settingsStore.ts # AI & Theme Config
│   ├── styles/            # Tailwind Global Styles
│   └── types/             # TypeScript interfaces
├── public/                # Static assets & Models
└── Configuration files
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| AI Inference | **WebLLM** (WebGPU) + **Transformers.js** |
| Diagramming | React Flow (XY Flow) |
| Code Editor | Monaco Editor (Theme Aware) |
| State | Zustand |
| Icons | Lucide React |

## 📤 Export Formats

| Format | Description |
|--------|-------------|
| **PNG** | High-resolution raster image (3x pixel ratio) |
| **JPG** | Compressed image format |
| **SVG** | Vector graphics (scalable, high-fidelity) |
| **JSON** | Full diagram data (nodes, edges, metadata) |
| **Mermaid** | Mermaid.js code for use elsewhere |
| **React** | Complete React component with React Flow |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + S` | Save diagram |
| `Ctrl/⌘ + E` | Export diagram |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z` | Redo |
| `Delete/Backspace` | Delete selected node |
| `Escape` | Deselect / Close panel |

## 🗺️ Roadmap

- [x] Undo/Redo history
- [x] API for programmatic generation
- [x] Plugin system (Foundation)
- [ ] Real-time collaboration
- [ ] Custom node shapes
- [ ] Template library

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- [React Flow](https://reactflow.dev/) — Powerful diagram library
- [Mermaid.js](https://mermaid.js.org/) — Diagram syntax inspiration
- [Ollama](https://ollama.ai/) — Local AI inference
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first styling

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/vndangkhoa">vndangkhoa</a>
</p>
