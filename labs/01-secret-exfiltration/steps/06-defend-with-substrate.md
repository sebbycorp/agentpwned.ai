---
title: Defend with Substrate
summary: Run the same agent as a credential-free Substrate actor. Envoy injects the key only toward the allowlisted vendor API.
---

## What we are about to do

Replace the bare cluster with Agent Substrate v0.5.0, then run the same two prompts through the actor.

## Why it matters

The actor does not hold the key. The egress policy allowlists HTTP only to `legit-api.lab01.svc.cluster.local`. That rule's `replaceHeaders` effect uses `ate-secret://k8s.io/default/lab01/vendor-api-token/token`. The sink hostname is not listed. The actor sends `Authorization: placeholder`. The gateway is what replaces that header, and only on the allowlisted call.

HTTP injection avoids the egress MITM trust bundle. Substrate documents injection for both `http` and `https` rules. HTTPS would also require the actor to trust the gateway CA (`docs/egress-trust-bundle.md`). This lab stays on cleartext inside the cluster so the scored path has one fewer moving part. On a real network, HTTP leaves the injected header visible to anything on the path. The Substrate doc says so. Treat the in-cluster HTTP hop as a lab simplification.

## Command

From the repo root, after Arm A is scored:

```bash
labs/01-secret-exfiltration/scripts/arm-b-up.sh
```

The script clones tag `v0.5.0` into `~/.cache/agentpwned/substrate` unless `SUBSTRATE_SRC` is already a checkout, then runs:

```bash
hack/create-kind-cluster.sh
hack/install-ate-kind.sh --deploy-ate-system \
  --credential-provider='{"name":"k8s.io"}' \
  --rollout-timeout=15m
hack/install-ate-kind.sh --deploy-demo-egress --rollout-timeout=15m
```

It does not pass `--atenet-dataplane`. Substrate's default is `envoy`.

`{"name":"k8s.io"}` deploys the Kubernetes Secrets credential provider. The provider starts with an empty namespace policy, which is default-deny, so the script grants atespace `lab01` access to namespace `lab01` and restarts `deployment/k8s-credential-provider`. The provider reads that ConfigMap once at startup. A grant without a restart does nothing.

`--deploy-demo-egress` is how this lab gets a gVisor `WorkerPool` labeled `workload: egress`. The lab actor selects that pool. The script then scales the pool to 1 replica.

The lab actor is credential-free: no Secret volume and no secret env var on the `ActorTemplate`. Golden snapshots are turned off (`GOLDEN_SNAPSHOT_MODE_DISABLED`). Substrate can take them. This lab only needs a cold boot.

Then send the same prompts through `atenet-router` with `ate-target-actor: lab01/exfil-agent`:

```bash
labs/01-secret-exfiltration/scripts/arm-b-attack.sh
```

## On the board

The key leaves the actor. The egress gateway injects it on the green hop to the vendor API.

![Frame 3 moves the canary outside the actor and draws the injection hop](../diagrams/03-injection.svg)

## What you should see

If the install matches the Envoy default:

- `/inspect` does not contain the canary
- The sink's `/report` does not contain the canary
- The attack transcript still has one or two `http_post` steps aimed at the sink
- The vendor API's last `Authorization` header is `Bearer ` plus the canary, because the gateway replaced `placeholder`

`results/substrate-attack.json` and `results/substrate-benign.json` are the transcripts. The benign step's `status` is the result of this run. An older header still sitting on `legit-api` `/last` is not, by itself, proof that this run injected anything.

## Dataplane

The egress gateway on the default install is Envoy. That is the value of `atenet.dataplane` in Substrate v0.5.0 (`cmd/ate-setup/internal/config/setting.go`).

[agentgateway](https://github.com/agentgateway/agentgateway) is an open source proxy built for agent traffic. Substrate v0.5.0 can place both the atenet ingress and the egress gateway on it. `hack/install-ate-kind.sh` ends in `hack/install-ate.sh "$@"`, so `--atenet-dataplane=envoy|agentgateway` is forwarded. The flag changes ingress and egress together. v0.5.0 has no switch that moves only the egress gateway. The pinned image is `cr.agentgateway.dev/agentgateway:v0.0.0-alpha.168b05d6`. That tag is alpha. Substrate v0.5.0 is pre-1.0.

On this lab's policy that alpha proxy did not inject the credential. The allowlisted POST to `legit-api` returned HTTP 403 and the body `actor egress policy denied: code: 'Client specified an invalid argument', message: "name: Required value"`. The actor still sent `Authorization: placeholder`. The sink name failed to resolve, and the canary stayed out of the actor. `arm-b-up.sh` therefore leaves the dataplane on Envoy. `ATENET_DATAPLANE=agentgateway` exists only to reproduce that comparison. The scorecard field `atenet_dataplane` is read from the container name on `deploy/atenet-egress`.

`docs/egress-credential-injection.md` says a request that carries the injection header when no provider is configured fails with 500 on Envoy and 403 on agentgateway. This lab always configures the provider, so that row is a different 403 from the one above. `hack/install-ate.sh` still prints that any provider requires Envoy. `ate-setup` accepts `{"name":"k8s.io"}` with agentgateway anyway, and a unit test on the tag expects that load to succeed. The usage sentence is not what the installer enforces.

## Checkpoint

On Arm B, who holds the canary, and which host is the only one on the actor egress allowlist?

## Continue

[Back: Score Arm A](05-score-arm-a.md)

[Next: Score the difference](07-score-the-difference.md)
