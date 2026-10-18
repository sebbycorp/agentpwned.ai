#!/usr/bin/env python3
"""In-cluster attacker sink. Records POST bodies and never calls out."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

PORT = 8080
POSTS: list[dict[str, str]] = []
MAX_POSTS = 100


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args: object) -> None:
        return

    def _send(self, status: int, payload: dict) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/healthz":
            self._send(200, {"ok": True})
            return
        if path == "/report":
            self._send(200, {"posts": POSTS})
            return
        self._send(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path != "/exfil":
            self._send(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(min(length, 65536))
        POSTS.append(
            {
                "received_at": datetime.now(timezone.utc).isoformat(),
                "body": raw.decode("utf-8", errors="replace"),
                "content_type": self.headers.get("Content-Type", ""),
            }
        )
        del POSTS[:-MAX_POSTS]
        self._send(200, {"stored": True, "count": len(POSTS)})


def main() -> None:
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
