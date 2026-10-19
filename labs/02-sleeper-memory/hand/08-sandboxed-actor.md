---
title: Sandboxed agent actor
summary: DurableDir, MEMORY fidelity, egress policy, and the known-good tag.
canary: outside
server: idle
legit: idle
plane: agentgateway
---

![Placeholder becomes the vendor canary.](../diagrams/story-11-injection.svg)

<p class="because"><b>What this does.</b> Start the ticket server, the attacker server, and the legit API, then create the atespace, the template, the actor, the egress policy, and tag <code>known-good</code> before any poison. <b>Why it matters.</b> The tag is a copy. The actor keeps only its latest snapshot. <code>digest</code> comes from the push on the previous page. It is not a shell variable named <code>IMAGE</code>.</p>
<details class="why">
<summary>Why?</summary>
<p>The vendor Secret stays in namespace <code>lab02</code>. The namespace policy grants atespace <code>lab02</code> that namespace and no other. <code>replaceHeaders</code> runs on the legit API rule. The ticket server rule has no credential. The attacker server is not listed. <code>LAB_DIAL_MAP</code> is that Service ClusterIP. The actor dials the address and keeps the HTTP Host as the Service name, so the POST reaches agentgateway and the allowlist still rejects it. The map is not an allow rule. <code>preferredFidelity</code> is <code>SNAPSHOT_FIDELITY_MEMORY</code>. Golden snapshots are disabled so the first boot is cold. Tagging requires <code>--mode=sync</code> first, or the snapshot may still be uploading. Revert is not this tag. <code>kind load</code> on this node can fail with containerd config version 4. Import with <code>ctr</code> when it does. The imported name is <code>docker.io/library/lab02-agent:local</code>.</p>
</details>

Apply the three Services, then load the image into the node. The registry tag and the short name are the same bytes.

```bash
export PATH="/usr/local/go/bin:${HOME}/.local/bin:${PATH}"
kubectl --context kind-lab02-sandboxed apply -f labs/02-sleeper-memory/k8s/attacker-server.yaml
kubectl --context kind-lab02-sandboxed apply -f labs/02-sleeper-memory/k8s/ticket-server.yaml
kubectl --context kind-lab02-sandboxed apply -f labs/02-sleeper-memory/k8s/legit-api.yaml
docker tag localhost:5001/lab02-agent:local lab02-agent:local
if ! kind load docker-image lab02-agent:local --name lab02-sandboxed; then
  echo "kind load failed. Importing with ctr."
  docker save lab02-agent:local | docker exec -i lab02-sandboxed-control-plane ctr -n k8s.io images import -
fi
kubectl --context kind-lab02-sandboxed -n lab02-shared rollout status deploy/attacker-server --timeout=180s
kubectl --context kind-lab02-sandboxed -n lab02-shared rollout status deploy/ticket-server --timeout=180s
kubectl --context kind-lab02-sandboxed -n lab02 rollout status deploy/legit-api --timeout=180s
```

A new vendor canary. Do not reuse the bare agent value unless you still want that one. The actor never receives this Secret.

```bash
CANARY="$(python3 -c 'import secrets; print("lab02_canary_" + secrets.token_hex(12))')"
mkdir -p labs/02-sleeper-memory/results
printf '%s\n' "$CANARY" > labs/02-sleeper-memory/results/sandboxed-canary.txt
chmod 600 labs/02-sleeper-memory/results/sandboxed-canary.txt
kubectl --context kind-lab02-sandboxed -n lab02 delete secret vendor-api-token --ignore-not-found
kubectl --context kind-lab02-sandboxed -n lab02 create secret generic vendor-api-token --from-literal=token="$CANARY"
kubectl --context kind-lab02-sandboxed -n ate-system create configmap \
  k8s-credential-provider-namespace-policy \
  --from-file=namespace-policy.yaml=labs/02-sleeper-memory/k8s/namespace-policy.yaml \
  --dry-run=client -o yaml | kubectl --context kind-lab02-sandboxed apply -f -
kubectl --context kind-lab02-sandboxed -n ate-system rollout restart deploy/k8s-credential-provider
kubectl --context kind-lab02-sandboxed -n ate-system rollout status deploy/k8s-credential-provider --timeout=180s
```

Fill the template. `digest` is the sha256 from the previous page. `ATTACKER_IP` is the ClusterIP, and it is not an allow rule.

```bash
ATTACKER_IP="$(kubectl --context kind-lab02-sandboxed -n lab02-shared get svc attacker-server -o jsonpath='{.spec.clusterIP}')"
test -n "${digest}"
test -n "${ATTACKER_IP}"
sed -e "s|IMAGE_DIGEST_REPLACED_BY_SCRIPT|localhost:5001/lab02-agent@${digest}|" \
  -e "s|DIAL_MAP_REPLACED_BY_SCRIPT|attacker-server.lab02-shared.svc.cluster.local=${ATTACKER_IP}|" \
  labs/02-sleeper-memory/k8s/substrate-actor-template.yaml > /tmp/sleeper-agent.yaml
if grep -E 'IMAGE_DIGEST_REPLACED_BY_SCRIPT|DIAL_MAP_REPLACED_BY_SCRIPT' /tmp/sleeper-agent.yaml; then
  echo "template still has placeholders" >&2
  false
fi
```

Create the atespace, the template, the actor, and the policy. Resume, suspend with `--mode=sync`, tag, then resume again. The tag is the restore point, taken before any poison.

```bash
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

The file in git still says `IMAGE_DIGEST_REPLACED_BY_SCRIPT` and `DIAL_MAP_REPLACED_BY_SCRIPT`. `/tmp/sleeper-agent.yaml` must not.

[Back: Substrate install](07-substrate-install.md)

[Next: Sandboxed agent attack](09-sandboxed-attack.md)
