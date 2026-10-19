---
title: Bare agent workloads
summary: Ticket server, attacker server, and legit API. No agent yet.
canary: not placed
server: idle
legit: idle
plane: none
---

![Agent, memory, ticket, legit API, attacker server.](../diagrams/story-02-agent-memory.svg)

<p class="because"><b>What this does.</b> Build the lab image and apply the three in-cluster Services. <b>Why it matters.</b> The attack has nowhere to go until these exist. None of them call out of the cluster.</p>
<details class="why">
<summary>Why?</summary>
<p>One image runs four programs. The command in each Deployment picks the file. The attacker server records POST <code>/exfil</code>. The legit API records the Authorization header it actually received. The ticket server serves T-POISON and T-CLEAN.</p>
</details>

```bash
docker build -t lab02-agent:local labs/02-sleeper-memory/agent
kind load docker-image lab02-agent:local --name lab02-bare
kubectl --context kind-lab02-bare apply -f labs/02-sleeper-memory/k8s/attacker-server.yaml
kubectl --context kind-lab02-bare apply -f labs/02-sleeper-memory/k8s/ticket-server.yaml
kubectl --context kind-lab02-bare apply -f labs/02-sleeper-memory/k8s/legit-api.yaml
kubectl --context kind-lab02-bare -n lab02-shared rollout status deploy/attacker-server --timeout=180s
kubectl --context kind-lab02-bare -n lab02-shared rollout status deploy/ticket-server --timeout=180s
kubectl --context kind-lab02-bare -n lab02 rollout status deploy/legit-api --timeout=180s
```

[Back: Bare agent cluster](02-bare-cluster.md)

[Next: Bare agent](04-bare-agent.md)
