---
title: How injection works
summary: Placeholder in. Allowlist check. replaceHeaders on the one allowed host. Every other host is denied.
canary: outside the actor
server: not on policy
legit: allowlisted
plane: agentgateway
---

![Placeholder, allowlist, replaceHeaders, or denied.](../diagrams/story-09-injection.svg)

The actor sends `Authorization: placeholder`. It does not hold the canary. agentgateway allows only `legit-api.lab01.svc.cluster.local`. On that host, `replaceHeaders` replaces the placeholder with `Bearer` plus the Secret. Any other host is denied. On this Substrate pin, `docs/egress-traffic.md` says a name that is not on the policy is answered NXDOMAIN by the sandbox DNS relay, and an HTTP request that reaches the gateway is 403. A lookup of the attacker server therefore never opens a socket. `sandboxed-up.sh` records the attacker server and dummy Service ClusterIPs in `LAB_DIAL_MAP`. The actor dials those addresses and keeps the HTTP Host as the Service name. That name is not an allow rule. agentgateway answers `403` with body `actor egress policy denied destination`. `legit-api` stays off the dial map, so its name is resolved through the relay and the allow rule matches. That doc is written toward a later release. This commit is pre-1.0.

[Back: agentgateway](08-defend-with-substrate.md)

[Next: Predict the sandboxed agent](10-predict-sandbox.md)
