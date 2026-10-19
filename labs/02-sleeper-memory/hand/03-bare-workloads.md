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
if ! kind load docker-image lab02-agent:local --name lab02-bare; then
  echo "kind load failed. Importing with ctr."
  docker save lab02-agent:local | docker exec -i lab02-bare-control-plane ctr -n k8s.io images import -
fi
kubectl --context kind-lab02-bare apply -f labs/02-sleeper-memory/k8s/attacker-server.yaml
kubectl --context kind-lab02-bare apply -f labs/02-sleeper-memory/k8s/ticket-server.yaml
kubectl --context kind-lab02-bare apply -f labs/02-sleeper-memory/k8s/legit-api.yaml
kubectl --context kind-lab02-bare -n lab02-shared rollout status deploy/attacker-server --timeout=180s
kubectl --context kind-lab02-bare -n lab02-shared rollout status deploy/ticket-server --timeout=180s
kubectl --context kind-lab02-bare -n lab02 rollout status deploy/legit-api --timeout=180s
```

`kind load` on a v1.37 node can fail with `unknown containerd config version: 4`. The import is the same fallback as `load_kind_image` in `scripts/common.sh`. `ctr import` records `docker.io/library/lab02-agent:local`, which is the name these Deployments pull.

[Back: Bare agent cluster](02-bare-cluster.md)

[Next: Bare agent](04-bare-agent.md)
