---
title: How injection works
summary: Placeholder in. Allowlist check. replaceHeaders on the one allowed host. Every other host is denied.
canary: outside the actor
sink: not on policy
legit: allowlisted
plane: envoy
---

![Placeholder, allowlist, replaceHeaders, or denied.](../diagrams/story-09-injection.svg)

The actor sends `Authorization: placeholder`. It does not hold the canary. Envoy allows only `legit-api.lab01.svc.cluster.local`. On that host, `replaceHeaders` replaces the placeholder with `Bearer` plus the Secret. Any other host is denied. DNS for a name that is not on the policy is REFUSED, and an HTTP request that reaches the gateway is 403.

[Back: Envoy](07-defend-with-substrate.md)

[Next: Predict Arm B](09-predict-sandbox.md)
