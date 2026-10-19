---
title: Tear down
summary: Delete both kind clusters. The boards stay.
canary: gone
sink: gone
legit: gone
plane: agentgateway
---

![Bare beside agentgateway, then both clusters go away.](../diagrams/story-08-compare.svg)

```bash
labs/01-secret-exfiltration/scripts/arm-a-down.sh
labs/01-secret-exfiltration/scripts/arm-b-down.sh
```

You pwned the bare agent, replayed the leak, locked the actor down with agentgateway, and the same prompts failed. Arm A stored the canary in the process, and the sink kept one post. Arm B kept the canary out of the actor, injected it on the allowlisted call, and left the sink empty.

[Back: The difference](13-score-the-difference.md)
