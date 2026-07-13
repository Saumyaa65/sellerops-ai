"""Shared utility helpers."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def generate_run_id() -> str:
    """Generate a unique agent run ID."""
    return f"run_{uuid.uuid4().hex[:12]}"


def utc_now() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    """Return current UTC datetime as ISO string."""
    return utc_now().isoformat()


def load_json_file(path: str | Path) -> Any:
    """Load and parse a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_text_file(path: str | Path) -> str:
    """Load a plain text file."""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def truncate_text(text: str, max_chars: int = 500) -> str:
    """Truncate text for display purposes."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "..."


def build_sse_message(event: str, data: dict) -> str:
    """Format a Server-Sent Event message string."""
    payload = json.dumps(data)
    return f"event: {event}\ndata: {payload}\n\n"
