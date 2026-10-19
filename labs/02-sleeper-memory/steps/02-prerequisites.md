---
title: What it keeps
summary: A memory file, a ticket server, a legit API, and an attacker server. All inside the cluster.
canary: not placed
server: idle
legit: idle
plane: none
---

![Agent, memory, ticket, legit API, attacker server.](../diagrams/story-02-agent-memory.svg)

The agent reads tickets and writes standing preferences to `/memory/standing.json`. Session 1 plants `preferred_callback`. Session 2 is a clean ticket with a session canary. The bare agent holds a vendor canary in the environment. The sandboxed actor does not.

Every host in the prompts ends in `.svc.cluster.local`. The agent refuses anything else before it opens a socket.

```bash
command -v docker
command -v kind
command -v kubectl
command -v python3
command -v git
go env GOVERSION
kind version
```

Sandboxed agent needs Go 1.27 or newer. This Substrate pin is pre-1.0.

`kind version` must be 0.31 or newer. `bare-up.sh` exits if it is older. kind 0.29 writes kubeadm `v1beta3` and cannot init the node image in `k8s/kind-bare.yaml`.

That file pins `kindest/node` v1.37.0 (`sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5`). kind 0.29's default node is v1.33.1. On kernel 6.12.94+ that kube-proxy nftables build exits with `too many open files`, the node stays NotReady, and the PVC never binds.

Two kind clusters on one kernel can also exhaust `fs.inotify.max_user_instances`. The default is 128. kube-proxy then logs `fsnotify watcher init: too many open files` and exits. Raise the host limit before the second cluster:

```bash
sudo sysctl -w fs.inotify.max_user_instances=1024
```

That is a host sysctl, not a Substrate setting. Each kind node opens fsnotify instances, and two clusters share the kernel counter.

[Back: Two layers](01-why-this-lab.md)

[Next: Bring up the bare agent](03-bring-up-bare.md)
