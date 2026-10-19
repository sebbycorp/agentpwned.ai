---
title: Tear down
summary: Delete both kind clusters and the local registry the Substrate install created.
canary: gone
sink: gone
legit: gone
plane: agentgateway
---

![Bare beside agentgateway, then both clusters go away.](../diagrams/story-08-compare.svg)

<p class="because"><b>What this does.</b> Delete the kind clusters <code>lab01-bare</code> and <code>kind</code>, and remove the local registry container. <b>Why it matters.</b> Those are the clusters this lab created. The registry is the one <code>create-kind-cluster.sh</code> started on port 5001. Deleting the cluster deletes the canary Secret with it.</p>
<details class="why">
<summary>Why?</summary>
<p><code>kind delete</code> removes the node containers. <code>docker rm</code> removes <code>kind-registry</code>. Score files under <code>results/</code> stay on disk and are gitignored. Do not point the prompt at a host outside the cluster.</p>
</details>

`arm-a-down.sh` deletes `lab01-bare`. `arm-b-up.sh` may already have deleted it.

```bash
kind delete cluster --name lab01-bare || true
```

`arm-b-down.sh` deletes the Substrate cluster and the registry container.

```bash
kind delete cluster --name kind || true
docker rm -f kind-registry >/dev/null 2>&1 || true
```

Check both are gone.

```bash
kind get clusters
docker ps -a --filter name=kind-registry --format '{{.Names}}'
```

This run printed `No kind clusters found.` The registry name filter printed nothing.

[Back: Arm B score](10-arm-b-score.md)
