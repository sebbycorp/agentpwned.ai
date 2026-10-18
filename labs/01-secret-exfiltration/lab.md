---
title: Secret Exfiltration
slug: 01-secret-exfiltration
status: draft
duration: 2 hours
difficulty: intermediate
---

Students run one prompt-injection message against two local kind deployments. Arm A stores a fake API key in the agent. The agent reads it and POSTs it to an in-cluster sink. Arm B runs the same agent as an Agent Substrate v0.5.0 actor: the actor is credential-free, the egress gateway injects the key only toward an allowlisted vendor API, and the sink is not allowlisted. The walkthrough is `steps/`. The egress dataplane on the default install is Envoy. agentgateway was tried on v0.5.0 and returned HTTP 403 (`name: Required value`) on the allowlisted call, so it is not the lab default. A scorecard reads the cluster and reports the difference. An optional extension describes a kagent `Agent` plus `EgressPolicy` on current main. That API is alpha, is not in the v1.0.0-alpha14 release, and is not scored. There is no `SandboxAgent` CRD.
