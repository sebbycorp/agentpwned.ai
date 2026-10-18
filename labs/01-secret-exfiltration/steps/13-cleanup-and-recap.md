---
title: Tear down
summary: Delete both kind clusters. The boards stay.
canary: gone
sink: gone
legit: gone
plane: envoy
---

![Bare beside Envoy, then both clusters go away.](../diagrams/story-08-compare.svg)

```bash
labs/01-secret-exfiltration/scripts/arm-a-down.sh
labs/01-secret-exfiltration/scripts/arm-b-down.sh
```

Arm A stored the canary in the process, and the sink kept it. Arm B on Envoy kept the canary out of the actor, injected it on the allowlisted call, and left the sink empty.

[Back: Try to get the canary out](12-challenge.md)
