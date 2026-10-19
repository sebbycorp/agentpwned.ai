---
title: Prerequisites
summary: The commands the bring-up scripts look for before they build anything.
canary: not placed
server: idle
legit: idle
plane: none
---

![Agent, memory, ticket, legit API, attacker server.](../diagrams/story-02-agent-memory.svg)

<p class="because"><b>What this does.</b> Confirm Docker, kind 0.31 or newer, kubectl, Python, git, and Go 1.27 or newer. Pin the bare node at <code>kindest/node</code> v1.37.0, and raise <code>fs.inotify.max_user_instances</code> before a second cluster. <b>Why it matters.</b> kind 0.29 cannot init that node image, and two clusters exhaust the default inotify counter.</p>
<details class="why">
<summary>Why?</summary>
<p>Docker builds the image. kubectl applies YAML. Python runs the agent and the scorecard. git fetches Substrate commit 3d3b929 when the checkout is not already that commit. The sandboxed script runs the same Go check. <code>k8s/kind-bare.yaml</code> pins <code>kindest/node</code> v1.37.0 (<code>sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5</code>). kind 0.29 writes kubeadm <code>v1beta3</code>, so it cannot init that image, and its default node v1.33.1 exits kube-proxy nftables with <code>too many open files</code> on kernel 6.12.94+. <code>bare-up.sh</code> requires kind 0.31 or newer. Two kind clusters share the host <code>fs.inotify.max_user_instances</code> counter. The default is 128. kube-proxy then logs <code>fsnotify watcher init: too many open files</code> and exits. The sysctl below raises that host limit. It is not a Substrate setting.</p>
</details>

```bash
export PATH="/usr/local/go/bin:${HOME}/.local/bin:${PATH}"
command -v docker && command -v kind && command -v kubectl && command -v python3 && command -v git && go env GOVERSION
kind version
sudo sysctl -w fs.inotify.max_user_instances=1024
```

Stop if `kind version` is older than 0.31. The sysctl is what this host needed once both clusters were up.

[Overview](../README.md)

[Next: Bare agent cluster](02-bare-cluster.md)
