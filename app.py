"""
CodeForge AI — AI-Powered Code Generator
=========================================

A local, offline coding assistant that runs entirely on your machine using
Ollama. Flask serves the UI and proxies requests to the local model.

Modules (per the project spec):
    1. Natural Language Understanding  -> folded into "generate"
    2. AI Code Generation Engine       -> generate
    3. Code Explanation                -> explain
    4. Debugging Assistant             -> debug
    5. Code Optimization Engine        -> optimize
    6. Documentation Generator         -> document
    7. Learning Assistant              -> learn
    8. Code Review System              -> review

Run:
    python app.py
Then open http://localhost:5000
"""

import io
import json

from flask import Flask, Response, jsonify, render_template, request, send_file, stream_with_context

import database as db
import ollama_client as ollama
from prompts import MODES, build_system_prompt, build_user_prompt

app = Flask(__name__)

# File extension used when a generated answer is downloaded per language.
_EXTENSIONS = {
    "python": "py", "javascript": "js", "typescript": "ts", "java": "java",
    "c": "c", "c++": "cpp", "cpp": "cpp", "c#": "cs", "csharp": "cs",
    "go": "go", "rust": "rs", "php": "php", "ruby": "rb", "sql": "sql",
    "html": "html", "css": "css", "bash": "sh", "shell": "sh", "kotlin": "kt",
    "swift": "swift", "r": "r", "auto": "md",
}


@app.route("/")
def index():
    """Serve the single-page app."""
    return render_template("index.html", modes=MODES)


@app.route("/api/health")
def health():
    """Report whether Ollama is reachable and which models are installed."""
    available = ollama.is_available()
    models = ollama.list_models() if available else []
    return jsonify(
        {
            "ollama_available": available,
            "models": models,
            "default_model": ollama.DEFAULT_MODEL,
            "host": ollama.OLLAMA_HOST,
        }
    )


@app.route("/api/process", methods=["POST"])
def process():
    """
    Main endpoint. Streams the model's reply back to the browser as plain text,
    then saves the full interaction to history.

    Expected JSON body: {mode, content, language, model}
    """
    data = request.get_json(force=True, silent=True) or {}
    mode = data.get("mode", "generate")
    content = (data.get("content") or "").strip()
    language = data.get("language", "auto")
    model = data.get("model") or ollama.DEFAULT_MODEL

    if not content:
        return jsonify({"error": "Please enter a prompt or some code."}), 400
    if mode not in MODES:
        return jsonify({"error": f"Unknown mode '{mode}'."}), 400

    system_prompt = build_system_prompt(mode, language)
    user_prompt = build_user_prompt(mode, content, language)

    def generate():
        collected = []
        try:
            for chunk in ollama.chat_stream(system_prompt, user_prompt, model):
                collected.append(chunk)
                yield chunk
        except ollama.OllamaError as exc:
            yield f"\n\n[ERROR] {exc}"
            return
        # Persist only successful, non-empty answers.
        full = "".join(collected)
        if full.strip():
            db.add_entry(mode, language, model, content, full)

    return Response(stream_with_context(generate()), mimetype="text/plain")


@app.route("/api/history")
def history_list():
    """Return recent history entries (newest first)."""
    return jsonify(db.list_entries())


@app.route("/api/history/<int:entry_id>")
def history_get(entry_id):
    """Return one full history entry."""
    entry = db.get_entry(entry_id)
    if not entry:
        return jsonify({"error": "Not found"}), 404
    return jsonify(entry)


@app.route("/api/history/<int:entry_id>", methods=["DELETE"])
def history_delete(entry_id):
    """Delete one history entry."""
    ok = db.delete_entry(entry_id)
    return jsonify({"deleted": ok})


@app.route("/api/history", methods=["DELETE"])
def history_clear():
    """Delete all history."""
    db.clear_all()
    return jsonify({"cleared": True})


@app.route("/api/download/<int:entry_id>")
def download(entry_id):
    """Download a saved answer as a text/code file."""
    entry = db.get_entry(entry_id)
    if not entry:
        return jsonify({"error": "Not found"}), 404
    ext = _EXTENSIONS.get((entry["language"] or "auto").lower(), "md")
    buf = io.BytesIO(entry["response"].encode("utf-8"))
    buf.seek(0)
    return send_file(
        buf,
        as_attachment=True,
        download_name=f"codeforge_{entry['mode']}_{entry_id}.{ext}",
        mimetype="text/plain",
    )


if __name__ == "__main__":
    db.init_db()
    print("=" * 60)
    print("  CodeForge AI  -  AI-Powered Code Generator (local)")
    print("=" * 60)
    if ollama.is_available():
        print(f"  Ollama: connected ({ollama.OLLAMA_HOST})")
        print(f"  Models: {', '.join(ollama.list_models()) or '(none)'}")
    else:
        print(f"  Ollama: NOT reachable at {ollama.OLLAMA_HOST}")
        print("  Start it with:  ollama serve")
    print("  Open:   http://localhost:5000")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5000, debug=True)
