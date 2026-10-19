---
title: Secret Exfiltration
slug: 01-secret-exfiltration
status: draft
duration: 2 hours
difficulty: intermediate
---

Students run one prompt-injection message against two local kind deployments. Bare agent stores a fake API key in the agent. The agent reads it and POSTs it to an in-cluster attacker server. Sandboxed agent runs the same agent as an actor on unreleased Substrate main (`3d3b929`): the actor is credential-free, agentgateway injects the key only toward an allowlisted vendor API, and the attacker server is not allowlisted. The walkthrough is `steps/`. The egress dataplane is agentgateway, pinned by digest to revision `955d56f`. Both that Substrate commit and the agentgateway image are pre-1.0. v0.5.0 plus its pinned agentgateway returns HTTP 403 (`name: Required value`) on the allowlisted call, so that pair is not the lab. A scorecard reads the cluster and reports the difference. An optional extension describes a kagent `Agent` plus `EgressPolicy` on current main. That API is alpha, is not in the v1.0.0-alpha14 release, and is not scored. There is no `SandboxAgent` CRD.
