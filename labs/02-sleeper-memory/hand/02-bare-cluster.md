---
title: Bare agent cluster
summary: A kind cluster whose kube-proxy mode is nftables.
canary: not placed
server: idle
legit: idle
plane: none
---

![Agent, memory, ticket, legit API, attacker server.](../diagrams/story-02-agent-memory.svg)

<p class="because"><b>What this does.</b> Create cluster <code>lab02-bare</code> from <code>k8s/kind-bare.yaml</code>. <b>Why it matters.</b> Some kernels reject the iptables statistic match. ClusterIP and DNS then never program. nftables is a kind setting.</p>
<details class="why">
<summary>Why?</summary>
<p><code>bare-up.sh</code> also calls <code>ensure_cluster_services</code>, the same helper as Lab 01, in case a cluster was created without that setting. You only need it when kube-proxy logged the statistic failure.</p>
</details>

```bash
kind create cluster --name lab02-bare --config labs/02-sleeper-memory/k8s/kind-bare.yaml
kubectl cluster-info --context kind-lab02-bare
```

[Back: Prerequisites](01-prerequisites.md)

[Next: Bare agent workloads](03-bare-workloads.md)
