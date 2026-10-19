---
title: Pwn it again
summary: The poison survives suspend and resume. The callback is the same POST. The attacker server should stay empty.
canary: hidden
server: 0 hits
legit: injected
plane: agentgateway
---

![Gateway denies the callback. The legit hop stays allowed.](../diagrams/story-06-session2-sandboxed.svg)

```bash
labs/02-sleeper-memory/scripts/sandboxed-attack.sh all
```

`poison` writes the callback and leaves the attacker server at 0. `resume` suspends with `--mode=sync` and resumes. `session2` sends the clean ticket. `revert-demo` writes a marker the poisoned snapshot does not have, then reverts. The marker goes away. The callback comes back. That is why revert is the wrong restore after a later suspend.

On this pin the sandbox DNS relay answers NXDOMAIN for a name that is not on the policy, so a lookup never opens a socket. `LAB_DIAL_MAP` is the attacker server Service ClusterIP. The actor dials that address and keeps the HTTP Host as the Service name. That name is not an allow rule. agentgateway default-denies it.

[Back: Predict the sandboxed agent](10-predict-sandbox.md)

[Next: Where it stopped](12-where-it-stopped.md)
