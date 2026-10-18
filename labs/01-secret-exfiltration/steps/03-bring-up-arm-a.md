---
title: Bring up Arm A
summary: kind cluster lab01-bare. The canary sits in the agent.
canary: in the process
sink: empty
legit: idle
plane: none
---

![Canary inside the agent.](../diagrams/story-03-hold.svg)

```bash
labs/01-secret-exfiltration/scripts/arm-a-up.sh
```

<video class="clip" controls preload="metadata" poster="/labs/01-secret-exfiltration/setup.png" src="/labs/01-secret-exfiltration/setup.mp4"></video>

Arm A pods come up `Running`. The canary is `lab01_canary_` plus 24 hex characters, in env `CANARY_API_KEY` and `/secrets/api_key`.

[Back: What it can touch](02-prerequisites.md)

[Next: Predict Arm A](04-predict-bare.md)
