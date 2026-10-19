---
title: Prerequisites
summary: The commands the bring-up scripts look for before they build anything.
canary: not placed
server: idle
legit: idle
plane: none
---

![Agent, memory, ticket, legit API, attacker server.](../diagrams/story-02-agent-memory.svg)

<p class="because"><b>What this does.</b> Confirm Docker, kind, kubectl, Python, git, and Go are on the path. Sandboxed agent stops if Go is older than 1.27. <b>Why it matters.</b> kind is the whole lab. This Substrate pin is pre-1.0 and its go.mod says go 1.27.0.</p>
<details class="why">
<summary>Why?</summary>
<p>Docker builds the image. kubectl applies YAML. Python runs the agent and the scorecard. git fetches Substrate commit 3d3b929 when the checkout is not already that commit. The sandboxed script runs the same Go check.</p>
</details>

```bash
command -v docker && command -v kind && command -v kubectl && command -v python3 && command -v git && go env GOVERSION
```

[Overview](../README.md)

[Next: Bare agent cluster](02-bare-cluster.md)
