---
title: Substrate install
summary: kind, then Agent Substrate main with the agentgateway dataplane.
canary: not placed
server: idle
legit: idle
plane: agentgateway
---

![Sandbox beside state.](../diagrams/story-01-two-layers.svg)

<p class="because"><b>What this does.</b> Fetch commit <code>3d3b92921bd68931c509e1b5bd57df00e76ffff0</code>, pin the agentgateway digest, and run the kind installer. <b>Why it matters.</b> v0.5.0 plus its pinned agentgateway returns HTTP 403 <code>name: Required value</code>. This lab does not use that pair.</p>
<details class="why">
<summary>Why?</summary>
<p>The installer still lists an older agentgateway image. <code>pin_agentgateway_image</code> rewrites both lines to <code>cr.agentgateway.dev/agentgateway@sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f</code> before install. Revision <code>955d56f</code> includes the worker identity fix. The image and this Substrate commit are pre-1.0. <code>--atenet-dataplane=agentgateway</code> selects ingress and egress together. The credential provider is <code>k8s.io</code>.</p>
</details>

<code>sandboxed-up.sh</code> runs the block below. Go 1.27 or newer is required. The build comes from the checkout.

```bash
export KIND_CLUSTER_NAME=lab02-sandboxed
export KUBECTL_CONTEXT=kind-lab02-sandboxed
export KO_DOCKER_REPO=localhost:5001
hack/create-kind-cluster.sh
hack/install-ate-kind.sh \
  --deploy-ate-system \
  --atenet-dataplane=agentgateway \
  --credential-provider='{"name":"k8s.io"}' \
  --rollout-timeout=15m
hack/install-ate-kind.sh --deploy-demo-egress --rollout-timeout=15m
```

[Back: Bare agent score](06-bare-score.md)

[Next: Sandboxed agent actor](08-sandboxed-actor.md)
