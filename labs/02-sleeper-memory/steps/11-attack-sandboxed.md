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

On this pin the actor DNS relay answers NXDOMAIN for a name that is not on the policy, so a normal client never opens a socket. The sandboxed agent then dials the in-cluster address from the ticket server and sends the original Host header. The attacker server is still not on the policy. The HTTP request is what agentgateway denies.

[Back: Predict the sandboxed agent](10-predict-sandbox.md)

[Next: Where it stopped](12-where-it-stopped.md)
