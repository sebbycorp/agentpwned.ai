---
title: The difference
summary: Arm A leaked. Arm B on agentgateway hid the canary, blocked the sink, and injected the key.
canary: hidden
sink: 0 hits
legit: HTTP 200
plane: agentgateway
reveal: sandbox
answer: blocked
---

![Bare beside agentgateway.](../diagrams/story-07-compare.svg)

```bash
labs/01-secret-exfiltration/scripts/score.sh substrate
labs/01-secret-exfiltration/scripts/score.sh compare \
  labs/01-secret-exfiltration/results/bare.json \
  labs/01-secret-exfiltration/results/substrate.json
```

<video class="clip" controls preload="metadata" poster="/labs/01-secret-exfiltration/scorecard.png" src="/labs/01-secret-exfiltration/scorecard.mp4"></video>

`exercise_pass` does not include injection. `injection_demo` is the row that does. The kind run pastes `score.sh compare` here. `atenet_dataplane` on Arm B is `agentgateway`.

[Back: The sandboxed run](10-attack-arm-b.md)

[Next: Try to get the canary out](12-challenge.md)
