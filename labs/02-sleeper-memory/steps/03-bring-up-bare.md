---
title: Bring up the bare agent
summary: One kind cluster. A PVC holds the memory file. The vendor canary is in the pod.
canary: in the process
server: idle
legit: idle
plane: none
---

![Agent, memory, ticket, legit API, attacker server.](../diagrams/story-02-agent-memory.svg)

```bash
labs/02-sleeper-memory/scripts/bare-up.sh
```

This builds `lab02-agent:local`, creates kind cluster `lab02-bare`, and starts the ticket server, the attacker server, the legit API, and the bare agent. The memory file is a PVC mounted at `/memory`. Deleting the pod does not delete that disk.

The vendor canary is `CANARY_API_KEY` and `/secrets/api_key`. It is a lab value, not a real key.

[Back: What it keeps](02-prerequisites.md)

[Next: Predict the bare agent](04-predict-bare.md)
