"""
SQLite-backed history store.

Satisfies the functional requirement "Maintain coding history". Every request
and its generated output is persisted locally in history.db so the user can
revisit, reload, download, or delete past interactions.
"""

import os
import sqlite3
from datetime import datetime

DB_PATH = os.environ.get(
    "CODEFORGE_DB",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "history.db"),
)


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the history table if it does not already exist."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT    NOT NULL,
                mode       TEXT    NOT NULL,
                language   TEXT    NOT NULL,
                model      TEXT    NOT NULL,
                prompt     TEXT    NOT NULL,
                response   TEXT    NOT NULL
            )
            """
        )
        conn.commit()


def add_entry(mode, language, model, prompt, response):
    """Insert one interaction and return its new row id."""
    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO history (created_at, mode, language, model, prompt, response)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (datetime.now().isoformat(timespec="seconds"), mode, language, model, prompt, response),
        )
        conn.commit()
        return cur.lastrowid


def list_entries(limit=100):
    """Return recent history rows (newest first) without the full response body."""
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, created_at, mode, language, model,
                   substr(prompt, 1, 80) AS preview
            FROM history
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_entry(entry_id):
    """Return a single full history row, or None if not found."""
    with _connect() as conn:
        row = conn.execute("SELECT * FROM history WHERE id = ?", (entry_id,)).fetchone()
    return dict(row) if row else None


def delete_entry(entry_id):
    """Delete one history row. Returns True if a row was removed."""
    with _connect() as conn:
        cur = conn.execute("DELETE FROM history WHERE id = ?", (entry_id,))
        conn.commit()
        return cur.rowcount > 0


def clear_all():
    """Remove every history row."""
    with _connect() as conn:
        conn.execute("DELETE FROM history")
        conn.commit()
