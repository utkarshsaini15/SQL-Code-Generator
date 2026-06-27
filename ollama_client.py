"""
Thin wrapper around the local Ollama HTTP API.

Ollama runs locally (default http://localhost:11434) and exposes a simple REST
API. We use:
    GET  /api/tags     -> list installed models
    POST /api/chat     -> chat completion (supports streaming NDJSON)

Nothing here talks to the cloud; everything runs on the user's machine.
"""

import json
import os
import urllib.error
import urllib.request

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:latest")
REQUEST_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "600"))  # seconds


class OllamaError(Exception):
    """Raised when Ollama is unreachable or returns an error."""


def list_models():
    """Return a list of installed model names, e.g. ['llama3.2:latest']."""
    url = f"{OLLAMA_HOST}/api/tags"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError) as exc:
        raise OllamaError(
            f"Could not reach Ollama at {OLLAMA_HOST}. Is 'ollama serve' running?"
        ) from exc
    return [m.get("name") for m in data.get("models", []) if m.get("name")]


def is_available():
    """Return True if the Ollama server responds, False otherwise."""
    try:
        list_models()
        return True
    except OllamaError:
        return False


def _build_payload(system_prompt, user_prompt, model, stream):
    return {
        "model": model or DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": stream,
        "options": {"temperature": 0.3},
    }


def chat_stream(system_prompt, user_prompt, model=None):
    """
    Yield response text chunks as they arrive from Ollama.

    Streams the model's reply token-by-token so the UI can render it live.
    """
    url = f"{OLLAMA_HOST}/api/chat"
    payload = _build_payload(system_prompt, user_prompt, model, stream=True)
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT)
    except (urllib.error.URLError, OSError) as exc:
        raise OllamaError(
            f"Could not reach Ollama at {OLLAMA_HOST}. Is 'ollama serve' running?"
        ) from exc

    with resp:
        for raw_line in resp:
            line = raw_line.decode("utf-8").strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("error"):
                raise OllamaError(obj["error"])
            chunk = obj.get("message", {}).get("content", "")
            if chunk:
                yield chunk
            if obj.get("done"):
                break


def chat(system_prompt, user_prompt, model=None):
    """Return the full (non-streamed) model reply as a single string."""
    return "".join(chat_stream(system_prompt, user_prompt, model))
