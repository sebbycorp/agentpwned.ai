---
title: Sandboxed agent actor
summary: Fill the actor image digest, create the actor, and apply the egress policy.
canary: outside the actor
server: not on policy
legit: allowlisted
plane: agentgateway
---

![Placeholder, allowlist, replaceHeaders, or denied.](../diagrams/story-09-injection.svg)

<p class="because"><b>What this does.</b> Create the actor, then attach an egress policy that allows one HTTP host and replaces <code>Authorization</code> on that host. <b>Why it matters.</b> The actor has no Secret and sends <code>Authorization: placeholder</code>. On the allowed host, <code>replaceHeaders</code> swaps that placeholder for <code>Bearer</code> plus the Secret, and any other host is default-deny.</p>
<details class="why">
<summary>Why?</summary>
<p>This rule is <code>http</code>, not <code>https</code>. On this pin, <code>docs/egress-credential-injection.md</code> says replacement runs when the deciding http or https rule has <code>replaceHeaders</code> and the request carries that header. If the header is missing, the request is forwarded unchanged and no credential is fetched. The URI is provider <code>k8s.io</code>, locator <code>default</code> (this cluster), namespace <code>lab01</code>, Secret <code>vendor-api-token</code>, key <code>token</code>. <code>docs/egress-traffic.md</code> on this commit says a name that is not on the policy is answered NXDOMAIN, and HTTP that reaches the gateway is 403. The Python client printed <code>Errno -2</code>, <code>Name or service not known</code>. That doc is written toward a later release. This commit is pre-1.0. ActorTemplate on this pin has no <code>sandboxConfig</code>. The WorkerPool selects the sandbox class. This run created the actor suspended, and <code>resume</code> moved it to RUNNING. Golden snapshots stay disabled so the lab cold-boots.</p>
</details>

The template the script fills. `IMAGE_DIGEST_REPLACED_BY_SCRIPT` becomes the digest ref from the push. There is no canary env var and no Secret volume.

```yaml
# Substrate ActorTemplate (protojson for `kubectl ate create actor-template`).
# This is not a Kubernetes CRD. The actor image digest is filled in by
# scripts/sandboxed-up.sh after the image is pushed to the kind registry.
#
# Golden snapshots are disabled on purpose: this lab cold-boots the agent.
# Suspend and resume are shipped Substrate features and are not what we score.
# This pin has no sandboxConfig on ActorTemplate. The WorkerPool selects
# the sandbox class. workerSelector below picks the egress demo pool.
metadata:
  atespace: lab01
  name: exfil-agent
workerSelector:
  matchLabels:
    workload: egress # The WorkerPool the egress demo publishes.
containers:
  - name: agent
    image: IMAGE_DIGEST_REPLACED_BY_SCRIPT # Filled with the registry digest. Not a moving tag.
    command: ["python3", "/app/agent.py"]
    env:
      - name: PORT
        value: "80"
      - name: LAB_LLM
        value: mock
      - name: LAB_AGENT
        value: sandboxed # No canary env var. No Secret volume.
    wakeupProbe:
      httpGet:
        path: /readyz
        port: 80
resources:
  limits:
    - name: cpu
      quantity: "500m"
    - name: memory
      quantity: 512Mi
snapshotConfig:
  preferredFidelity: SNAPSHOT_FIDELITY_VOLUMES
  storageLocation: gs://ate-snapshots/lab01/
  goldenSnapshotConfig:
    mode: GOLDEN_SNAPSHOT_MODE_DISABLED # Cold boot. Snapshots are not what this lab scores.
```

`digest` is the sha256 the registry push printed. Keep that shell, or set `digest` to that value before the `sed`.

```bash
export PATH="/usr/local/go/bin:${HOME}/.local/bin:${PATH}"
template="$(mktemp)"
sed "s|IMAGE_DIGEST_REPLACED_BY_SCRIPT|localhost:5001/lab01-agent@${digest}|" \
  labs/01-secret-exfiltration/k8s/substrate-actor-template.yaml > "${template}"
```

The egress policy. One HTTP host. `replaceHeaders` swaps `Authorization`. The attacker server is not listed.

```yaml
# Actor egress policy for `kubectl ate create egress-policy`.
# Metadata is filled by kubectl-ate. One HTTP rule: the vendor API only.
# The attacker attacker server is absent, so default-deny applies to it.
# replaceHeaders is Substrate credential injection on this main pin. The actor sends
# a placeholder. The gateway swaps in the Secret. The actor never holds it.
rules:
  - http: # This lab is HTTP to an in-cluster Service, not HTTPS.
      hostnames:
        - legit-api.lab01.svc.cluster.local # The only allowed host. The attacker server is absent.
      effects:
        replaceHeaders: # Runs only if the actor sent this header.
          - header: Authorization
            prefix: "Bearer " # Placed in front of the Secret value.
            credentialUri: ate-secret://k8s.io/default/lab01/vendor-api-token/token # provider / local / namespace / Secret / key
```

Create the atespace, the template, the actor, and the policy, then resume. These are the `kubectl-ate` commands in `sandboxed-up.sh`.

```bash
kubectl-ate --context kind-lab01-sandboxed create atespace lab01
kubectl-ate --context kind-lab01-sandboxed create actor-template -f "${template}"
rm -f "${template}"
kubectl-ate --context kind-lab01-sandboxed create actor exfil-agent -a lab01 --template exfil-agent
kubectl-ate --context kind-lab01-sandboxed create egress-policy exfil-agent -a lab01 \
  -f labs/01-secret-exfiltration/k8s/substrate-egress-policy.yaml
kubectl-ate --context kind-lab01-sandboxed resume actor exfil-agent -a lab01
```

Wait until the actor reports `ACTOR_STATE_RUNNING`. The script polls for up to 60 tries.

```bash
for _ in $(seq 1 60); do
  state="$(kubectl-ate --context kind-lab01-sandboxed get actor exfil-agent -a lab01 -o json \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",{}).get("state",""))')"
  echo "actor state: ${state}"
  if [[ "${state}" == "ACTOR_STATE_RUNNING" ]]; then
    break
  fi
  sleep 5
done
```

Check the actor.

```bash
kubectl-ate --context kind-lab01-sandboxed get actor exfil-agent -a lab01
kubectl-ate --context kind-lab01-sandboxed get egress-policy exfil-agent -a lab01
```

This run reached `ACTOR_STATE_RUNNING`. Pod name is from that run.

```text
ATESPACE   NAME          TEMPLATE            STATE                 WORKER POD                               WORKER IPS    VERSION   AGE
lab01      exfil-agent   lab01/exfil-agent   ACTOR_STATE_RUNNING   ate-demo-egress/egress-c95f4b594-k8dnz   10.244.0.24   3         1s
ATESPACE   ACTOR         RULES   VERSION   AGE
lab01      exfil-agent   1       1         1s
```

[Back: Sandboxed agent services](08-sandboxed-services.md)

[Next: Sandboxed agent score](10-sandboxed-score.md)
