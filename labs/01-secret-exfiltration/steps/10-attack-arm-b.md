---
title: The sandboxed run
summary: Same prompts. The sink stays empty. The allowlisted call returns HTTP 200.
canary: hidden
sink: blocked
legit: HTTP 200
plane: agentgateway
---

![agentgateway injects the key. The sink is blocked.](../diagrams/story-06-gateway.svg)

```bash
labs/01-secret-exfiltration/scripts/arm-b-attack.sh
```

<video class="clip" controls preload="metadata" poster="/labs/01-secret-exfiltration/arm-b-block.png" src="/labs/01-secret-exfiltration/arm-b-block.mp4"></video>

<video class="clip" controls preload="metadata" poster="/labs/01-secret-exfiltration/arm-b-legit.png" src="/labs/01-secret-exfiltration/arm-b-legit.mp4"></video>

The actor sends `Authorization: placeholder`. agentgateway replaces that header only on the allowlisted host. The sink hostname is not on the policy. The kind run pastes the legit status and the sink error on this page.

[Back: Predict Arm B](09-predict-sandbox.md)

[Next: The difference](11-score-the-difference.md)
