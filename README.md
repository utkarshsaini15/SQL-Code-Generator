# CodeForge AI — AI-Powered Code Generator

An intelligent coding assistant that runs **100% locally and free** using
[Ollama](https://ollama.com). No cloud APIs, no API keys, no cost. It generates
code from natural language, explains it, debugs it, optimizes it, documents it,
reviews it, and teaches programming concepts.

> Built with Python + Flask (backend), a local LLM via Ollama (intelligence),
> SQLite (history), and a vanilla HTML/CSS/JS single-page UI (frontend).

---

## ✨ Features (mapped to the project modules)

| # | Module                         | In the app        |
|---|--------------------------------|-------------------|
| 1 | Natural Language Understanding | built into **Generate** |
| 2 | AI Code Generation Engine      | **Generate** |
| 3 | Code Explanation               | **Explain** |
| 4 | Debugging Assistant            | **Debug & Fix** |
| 5 | Code Optimization Engine       | **Optimize** |
| 6 | Documentation Generator        | **Document** |
| 7 | Learning Assistant             | **Learn** |
| 8 | Code Review System             | **Code Review** |

Plus the functional requirements: multi-language support, **coding history**
(SQLite), **downloadable outputs**, interactive streaming conversations, copy
buttons, and live syntax highlighting.

---

## 🧰 Requirements

- **Python 3.10+**
- **Ollama** installed and at least one model pulled
- **Flask** (`pip install flask`) — already the only dependency

---

## 🚀 Quick Start

### 1. Install / start Ollama and pull a model
```bash
ollama serve            # start the local server (if not already running)
ollama pull llama3.2    # ~2 GB; any chat/code model works
```

### 2. Install the Python dependency
```bash
pip install -r requirements.txt
```

### 3. Run the app
```bash
python app.py
```
…or on Windows just double-click **`run.bat`**.

### 4. Open it
Go to **http://localhost:5000** in your browser.

---

## 🖱️ How to use

1. Pick a **module** in the left sidebar (Generate, Explain, Debug, …).
2. Choose a **language** and **model** in the top-right.
3. Type your request / paste your code in the box.
4. Press **Run ▸** (or `Ctrl` + `Enter`). The answer streams in live.
5. **Copy** or **Download** the result; it's also saved to **History**.

---

## 🗂️ Project structure

```
SQL_Project/
├── app.py              # Flask server + routes
├── ollama_client.py    # talks to local Ollama (streaming)
├── prompts.py          # system prompts for all 8 modules
├── database.py         # SQLite history store
├── requirements.txt
├── run.bat             # Windows one-click launcher
├── history.db          # created automatically on first run
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    └── js/app.js
```

---

## ⚙️ Configuration (optional)

Set environment variables before running to change defaults:

| Variable        | Default                  | Purpose                       |
|-----------------|--------------------------|-------------------------------|
| `OLLAMA_HOST`   | `http://localhost:11434` | Ollama server URL             |
| `OLLAMA_MODEL`  | `llama3.2:latest`        | Default model                 |
| `CODEFORGE_DB`  | `./history.db`           | SQLite database file path     |

---

## ❓ Troubleshooting

- **"Ollama not running"** in the status bar → run `ollama serve` in a terminal.
- **No models in the dropdown** → pull one: `ollama pull llama3.2`.
- **Slow responses** → expected on CPU; smaller models (e.g. `llama3.2`) are faster.
- **Output looks like plain text** → the Markdown/highlight libraries load from a
  CDN; offline, the app still works but renders unstyled text.

---

## 📜 License

Educational project — free to use and modify.
