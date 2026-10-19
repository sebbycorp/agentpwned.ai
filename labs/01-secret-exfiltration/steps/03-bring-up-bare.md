---
title: Bring up the bare agent
summary: kind cluster lab01-bare. The canary sits in the agent.
canary: in the process
server: empty
legit: idle
plane: none
---

![Canary inside the agent.](../diagrams/story-03-hold.svg)

```bash
labs/01-secret-exfiltration/scripts/bare-up.sh
```

<video class="clip" controls preload="metadata" poster="/labs/01-secret-exfiltration/setup.png" src="/labs/01-secret-exfiltration/setup.mp4"></video>

Bare agent pods come up `Running`. The canary is `lab01_canary_` plus 24 hex characters, in env `CANARY_API_KEY` and `/secrets/api_key`.

[Build Bare agent by hand](../hand/02-bare-cluster.md)

[Back: What it can touch](02-prerequisites.md)

[Next: Predict the bare agent](04-predict-bare.md)
