---
title: Sleeper Memory
slug: 02-sleeper-memory
status: draft
duration: 3 hours
difficulty: intermediate
---

Students plant a standing callback in an agent's memory file, then show that the instruction is still there after a bare pod restart and after a Substrate suspend and resume. On the bare agent the next clean session POSTs that session's canary to the in-cluster attacker server. On the sandboxed agent the same poison survives, agentgateway default-deny blocks the callback, credential injection keeps the vendor canary out of the actor, and creating the actor again from a known-good tag removes the backdoor. The walkthrough is `steps/`. Agent Substrate is pre-1.0. This lab pins unreleased main `3d3b92921bd68931c509e1b5bd57df00e76ffff0` and agentgateway `cr.agentgateway.dev/agentgateway@sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f` (revision `955d56f`). OpenShell is a side note, not a scored dependency. There is no `SandboxAgent` CRD.
