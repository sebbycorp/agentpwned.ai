---
title: How injection works
summary: Placeholder in. Allowlist check. replaceHeaders on the one allowed host. Every other host is denied.
canary: outside the actor
sink: not on policy
legit: allowlisted
plane: agentgateway
---

![Placeholder, allowlist, replaceHeaders, or denied.](../diagrams/story-09-injection.svg)

The actor sends `Authorization: placeholder`. It does not hold the canary. agentgateway allows only `legit-api.lab01.svc.cluster.local`. On that host, `replaceHeaders` replaces the placeholder with `Bearer` plus the Secret. Any other host is denied. On this Substrate pin, `docs/egress-traffic.md` says a name that is not on the policy is answered NXDOMAIN, and an HTTP request that reaches the gateway is 403. The Python client printed `Errno -2`, `Name or service not known`. That doc is written toward a later release. This commit is pre-1.0.

[Back: agentgateway](07-defend-with-substrate.md)

[Next: Predict Arm B](09-predict-sandbox.md)
