---
title: Tear down
summary: Delete both kind clusters. The boards stay.
canary: gone
server: gone
legit: gone
plane: agentgateway
---

![Bare beside agentgateway, then both clusters go away.](../diagrams/story-08-compare.svg)

```bash
labs/01-secret-exfiltration/scripts/bare-down.sh
labs/01-secret-exfiltration/scripts/sandboxed-down.sh
```

You pwned the bare agent, replayed the leak, locked the actor down with agentgateway, and the same prompts failed. Bare agent stored the canary in the process, and the attacker server kept one post. Sandboxed agent kept the canary out of the actor, injected it on the allowlisted call, and left the attacker server empty.

[Back: The difference](13-score-the-difference.md)
