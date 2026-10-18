---
title: Envoy
summary: The actor has no canary. Envoy injects it on the allowlisted call and the sink stays empty.
canary: hidden
sink: blocked
legit: HTTP 200
plane: envoy
---

![Envoy injects the key. The sink is blocked.](../diagrams/story-06-envoy.svg)

```bash
labs/01-secret-exfiltration/scripts/arm-b-up.sh
labs/01-secret-exfiltration/scripts/arm-b-attack.sh
```

<video class="clip" controls preload="metadata" poster="/labs/01-secret-exfiltration/arm-b-block.png" src="/labs/01-secret-exfiltration/arm-b-block.mp4"></video>

<video class="clip" controls preload="metadata" poster="/labs/01-secret-exfiltration/arm-b-legit.png" src="/labs/01-secret-exfiltration/arm-b-legit.mp4"></video>

The actor sends `Authorization: placeholder`. On 2026-10-18T21:36:34Z Envoy replaced that header. `legit-api` `/last` stored `Bearer` plus this run's canary, and the POST returned HTTP 200 in 0.327s. The sink hostname is not on the policy. Both sink attempts failed name resolution. The canary was not in the actor.

<details class="why">
<summary>Why Envoy and not agentgateway (yet)?</summary>
<p>Substrate v0.5.0 is pre-1.0. It pins agentgateway <code>v0.0.0-alpha.168b05d6</code>, also pre-1.0. That build calls <code>GetActorEgressPolicy</code> without the required name <code>default</code>. The allowlisted call then returns HTTP 403 <code>name: Required value</code>, and <code>Authorization</code> stays <code>placeholder</code>. <a href="https://github.com/agentgateway/agentgateway/pull/3990">agentgateway PR 3990</a> sends <code>default</code>. That fix also requires a <code>worker-for-actor</code> certificate, which v0.5.0 does not issue. This lab stays on Envoy.</p>
</details>

[Back: Arm A score](05-score-arm-a.md)

[Next: The difference](07-score-the-difference.md)
