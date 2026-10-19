---
title: Bare agent
summary: A Deployment, a PVC, and a vendor canary in the environment.
canary: in the process
server: idle
legit: idle
plane: none
---

![Poison enters memory. Attacker stays at zero.](../diagrams/story-03-session1-poison.svg)

<p class="because"><b>What this does.</b> Put a canary Secret in <code>lab02-bare</code> and apply the bare agent. <b>Why it matters.</b> The PVC is why a restart does not wipe the poison. The Secret is why this process can see a vendor key the sandboxed actor never gets.</p>
<details class="why">
<summary>Why?</summary>
<p>kind's default StorageClass provisions the claim. The container mounts it at <code>/memory</code>. <code>CANARY_API_KEY</code> and <code>/secrets/api_key</code> are the same value. <code>LAB_DIAL_MAP</code> is unset here. Cluster DNS resolves the attacker server, so the callback reaches it.</p>
</details>

```bash
CANARY="$(python3 -c 'import secrets; print("lab02_canary_" + secrets.token_hex(12))')"
printf '%s\n' "$CANARY" > labs/02-sleeper-memory/results/bare-canary.txt
chmod 600 labs/02-sleeper-memory/results/bare-canary.txt
kubectl --context kind-lab02-bare create namespace lab02-bare --dry-run=client -o yaml | kubectl --context kind-lab02-bare apply -f -
kubectl --context kind-lab02-bare -n lab02-bare create secret generic vendor-api-token --from-literal=token="$CANARY"
kubectl --context kind-lab02-bare apply -f labs/02-sleeper-memory/k8s/bare-agent.yaml
kubectl --context kind-lab02-bare -n lab02-bare rollout status deploy/bare-agent --timeout=180s
```

[Back: Bare agent workloads](03-bare-workloads.md)

[Next: Bare agent attack](05-bare-attack.md)
