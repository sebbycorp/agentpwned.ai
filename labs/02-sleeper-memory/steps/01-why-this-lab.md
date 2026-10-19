---
title: Two layers
summary: The sandbox decides what the agent can do. The state layer decides who it is when it wakes up.
canary: not placed
server: idle
legit: idle
plane: none
---

![Sandbox beside state.](../diagrams/story-01-two-layers.svg)

Pwn an agent. See exactly how. Then lock it down.

A ticket the agent is supposed to read can plant a standing instruction in its memory. The sandbox never fires. The file is an allowed write. The next session obeys it.

The sandbox decides what your agent can do. The state layer decides who your agent is when it wakes up.

OpenShell is one execution sandbox: Landlock, seccomp, deny-by-default egress, credentials added outside the workload. Its Kubernetes driver keeps `/sandbox` on a PVC and does not restore process memory. This lab does not install OpenShell. The scored path is Agent Substrate on kind, with agentgateway. Substrate is pre-1.0.

[Overview](../README.md)

[Next: What it keeps](02-prerequisites.md)
