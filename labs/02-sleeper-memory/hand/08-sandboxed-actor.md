---
title: Sandboxed agent actor
summary: DurableDir, MEMORY fidelity, egress policy, and the known-good tag.
canary: outside
server: idle
legit: idle
plane: agentgateway
---

![Placeholder becomes the vendor canary.](../diagrams/story-11-injection.svg)

<p class="because"><b>What this does.</b> Create the atespace, the template, the actor, the egress policy, and tag <code>known-good</code> before any poison. <b>Why it matters.</b> The tag is a copy. The actor keeps only its latest snapshot.</p>
<details class="why">
<summary>Why?</summary>
<p>The vendor Secret stays in namespace <code>lab02</code>. The namespace policy grants atespace <code>lab02</code> that namespace and no other. <code>replaceHeaders</code> runs on the legit API rule. The ticket server rule has no credential. The attacker server is not listed. <code>LAB_DIAL_MAP</code> is that Service ClusterIP. The actor dials the address and keeps the HTTP Host as the Service name, so the POST reaches agentgateway and the allowlist still rejects it. The map is not an allow rule. <code>preferredFidelity</code> is <code>SNAPSHOT_FIDELITY_MEMORY</code>. Golden snapshots are disabled so the first boot is cold. Tagging requires <code>--mode=sync</code> first, or the snapshot may still be uploading. Revert is not this tag.</p>
</details>

```bash
kubectl --context kind-lab02-sandboxed -n lab02 create secret generic vendor-api-token --from-literal=token="$CANARY"
kubectl --context kind-lab02-sandboxed -n ate-system create configmap \
  k8s-credential-provider-namespace-policy \
  --from-file=namespace-policy.yaml=labs/02-sleeper-memory/k8s/namespace-policy.yaml \
  --dry-run=client -o yaml | kubectl --context kind-lab02-sandboxed apply -f -
kubectl --context kind-lab02-sandboxed -n ate-system rollout restart deploy/k8s-credential-provider
ATTACKER_IP="$(kubectl --context kind-lab02-sandboxed -n lab02-shared get svc attacker-server -o jsonpath='{.spec.clusterIP}')"
sed -e "s|IMAGE_DIGEST_REPLACED_BY_SCRIPT|${IMAGE}|" \
  -e "s|DIAL_MAP_REPLACED_BY_SCRIPT|attacker-server.lab02-shared.svc.cluster.local=${ATTACKER_IP}|" \
  labs/02-sleeper-memory/k8s/substrate-actor-template.yaml > /tmp/sleeper-agent.yaml
kubectl-ate --context kind-lab02-sandboxed create atespace lab02
kubectl-ate --context kind-lab02-sandboxed create actor-template -f /tmp/sleeper-agent.yaml
kubectl-ate --context kind-lab02-sandboxed create actor assistant-1 -a lab02 --template sleeper-agent
kubectl-ate --context kind-lab02-sandboxed create egress-policy assistant-1 -a lab02 \
  -f labs/02-sleeper-memory/k8s/substrate-egress-policy.yaml
kubectl-ate --context kind-lab02-sandboxed resume actor assistant-1 -a lab02
kubectl-ate --context kind-lab02-sandboxed suspend actor assistant-1 -a lab02 --mode=sync
kubectl-ate --context kind-lab02-sandboxed create tag known-good -a lab02 --actor assistant-1 --scope atespace
kubectl-ate --context kind-lab02-sandboxed resume actor assistant-1 -a lab02
```

The template's image line must be the digest <code>sandboxed-up.sh</code> pushed, and <code>LAB_DIAL_MAP</code> must be the attacker server ClusterIP. The file in git still says <code>IMAGE_DIGEST_REPLACED_BY_SCRIPT</code> and <code>DIAL_MAP_REPLACED_BY_SCRIPT</code>.

[Back: Substrate install](07-substrate-install.md)

[Next: Sandboxed agent attack](09-sandboxed-attack.md)
