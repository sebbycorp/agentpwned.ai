---
title: agentgateway
summary: Substrate main on agentgateway. The canary stays outside the actor.
canary: outside the actor
sink: empty
legit: not called
plane: agentgateway
---

![Canary stays outside the actor.](../diagrams/story-06-setup.svg)

```bash
labs/01-secret-exfiltration/scripts/arm-b-up.sh
```

The actor does not hold the canary. The Secret stays in the cluster. agentgateway is the egress proxy. The next board is the request path.

[Build Arm B by hand](../hand/06-substrate-kind.md)

<details class="why">
<summary>Why this pin, not v0.5.0?</summary>
<p>This lab needs unreleased Substrate main at <code>3d3b929</code> and a dev agentgateway build, both pre-1.0. The image is <code>cr.agentgateway.dev/agentgateway@sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f</code> (revision <code>955d56f</code>, which includes <a href="https://github.com/agentgateway/agentgateway/pull/3990">PR 3990</a>). v0.5.0 plus its pinned agentgateway (<code>v0.0.0-alpha.168b05d6</code>) calls <code>GetActorEgressPolicy</code> without <code>name=default</code> and returns HTTP 403 <code>name: Required value</code>. v0.5.0 also does not issue the worker-for-actor certificate that PR 3990 needs.</p>
</details>

[Back: Arm A score](07-score-arm-a.md)

[Next: How injection works](09-how-injection-works.md)
