---
title: Envoy
summary: Substrate v0.5.0 on Envoy. The canary stays outside the actor.
canary: outside the actor
sink: empty
legit: not called
plane: envoy
---

![Canary stays outside the actor.](../diagrams/story-06-setup.svg)

```bash
labs/01-secret-exfiltration/scripts/arm-b-up.sh
```

The actor does not hold the canary. The Secret stays in the cluster. The next board is the request path.

[Build Arm B by hand](../hand/06-substrate-kind.md)

<details class="why">
<summary>Why Envoy and not agentgateway (yet)?</summary>
<p>Substrate v0.5.0 is pre-1.0. It pins agentgateway <code>v0.0.0-alpha.168b05d6</code>, also pre-1.0. That build calls <code>GetActorEgressPolicy</code> without the required name <code>default</code>. The allowlisted call then returns HTTP 403 <code>name: Required value</code>, and <code>Authorization</code> stays <code>placeholder</code>. <a href="https://github.com/agentgateway/agentgateway/pull/3990">agentgateway PR 3990</a> sends <code>default</code>. That fix also requires a <code>worker-for-actor</code> certificate, which v0.5.0 does not issue. This lab stays on Envoy.</p>
</details>

[Back: Arm A score](06-score-arm-a.md)

[Next: How injection works](08-how-injection-works.md)
