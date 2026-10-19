---
title: Put it back
summary: Delete the actor. Create it from the known-good tag. The clean session does not call back.
canary: hidden
server: 0 hits
legit: HTTP 200
plane: agentgateway
---

![Create the actor from the known-good tag.](../diagrams/story-08-recover.svg)

```bash
labs/02-sleeper-memory/scripts/sandboxed-recover.sh
```

The script deletes the actor in any state, creates `assistant-1` again with `--tag known-good`, and creates the egress policy again. The policy is a child of the actor. Whether delete removed it is printed. The tag is not deleted. Do not delete `known-good` while an actor still borrows it.

The next clean session reads memory that has no `preferred_callback`. The transcript has no POST to the attacker server.

[Back: Where it stopped](12-where-it-stopped.md)

[Next: The difference](14-score-the-difference.md)
