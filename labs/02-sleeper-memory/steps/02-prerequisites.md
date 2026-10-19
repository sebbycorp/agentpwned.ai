---
title: What it keeps
summary: A memory file, a ticket server, a legit API, and an attacker server. All inside the cluster.
canary: not placed
server: idle
legit: idle
plane: none
---

![Agent, memory, ticket, legit API, attacker server.](../diagrams/story-02-agent-memory.svg)

The agent reads tickets and writes standing preferences to `/memory/standing.json`. Session 1 plants `preferred_callback`. Session 2 is a clean ticket with a session canary. The bare agent holds a vendor canary in the environment. The sandboxed actor does not.

Every host in the prompts ends in `.svc.cluster.local`. The agent refuses anything else before it opens a socket.

```bash
command -v docker
command -v kind
command -v kubectl
command -v python3
command -v git
go env GOVERSION
```

Sandboxed agent needs Go 1.27 or newer. This Substrate pin is pre-1.0.

[Back: Two layers](01-why-this-lab.md)

[Next: Bring up the bare agent](03-bring-up-bare.md)
