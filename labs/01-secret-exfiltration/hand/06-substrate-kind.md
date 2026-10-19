---
title: Substrate cluster
summary: Drop Arm A if it is up, check out the pinned Substrate commit, and create the kind cluster the installer expects.
canary: outside the actor
sink: empty
legit: not called
plane: none
---

![Canary stays outside the actor.](../diagrams/story-06-setup.svg)

<p class="because"><b>What this does.</b> Delete Arm A, check out Substrate commit <code>3d3b929</code>, then run Substrate's kind script with no extra flags. <b>Why it matters.</b> That script creates the cluster named <code>kind</code> and a registry on <code>127.0.0.1:5001</code>, which is where Arm B pushes images. This commit is unreleased main and is pre-1.0.</p>
<details class="why">
<summary>Why?</summary>
<p><code>arm-b-up.sh</code> deletes <code>lab01-bare</code> first so one machine is not running both clusters. A tag clone cannot select this commit, so the fetch uses the full SHA. The checkout is refused if <code>HEAD</code> is not <code>3d3b92921bd68931c509e1b5bd57df00e76ffff0</code>. Substrate's kind config uses kube-proxy iptables mode. The same nftables branch as Arm A switches it when the statistic match is missing. That switch is a kernel workaround, not a Substrate feature.</p>
</details>

`arm-b-up.sh` deletes `lab01-bare` so this machine has room for Substrate.

```bash
if kind get clusters 2>/dev/null | grep -qx lab01-bare; then
  kind delete cluster --name lab01-bare || true
fi
```

Fetch the pinned commit. The default path is `$HOME/.cache/agentpwned/substrate`. `--branch` cannot select a raw SHA.

```bash
export SUBSTRATE_REF="${SUBSTRATE_REF:-3d3b92921bd68931c509e1b5bd57df00e76ffff0}"
export SUBSTRATE_SRC="${SUBSTRATE_SRC:-${HOME}/.cache/agentpwned/substrate}"
mkdir -p "$(dirname "${SUBSTRATE_SRC}")"
if [[ ! -e "${SUBSTRATE_SRC}/.git" ]]; then
  mkdir -p "${SUBSTRATE_SRC}"
  git -C "${SUBSTRATE_SRC}" init
  git -C "${SUBSTRATE_SRC}" remote add origin https://github.com/agent-substrate/substrate.git
fi
head="$(git -C "${SUBSTRATE_SRC}" rev-parse HEAD 2>/dev/null || true)"
if [[ "${head}" != "${SUBSTRATE_REF}" ]]; then
  git -C "${SUBSTRATE_SRC}" fetch --depth 1 origin "${SUBSTRATE_REF}"
  git -C "${SUBSTRATE_SRC}" checkout --detach FETCH_HEAD
fi
git -C "${SUBSTRATE_SRC}" rev-parse HEAD
test "$(git -C "${SUBSTRATE_SRC}" rev-parse HEAD)" = "${SUBSTRATE_REF}"
```

Create the kind cluster and the local registry. The script runs this with no extra flags. It deletes an existing cluster named `kind`.

```bash
( cd "${SUBSTRATE_SRC}" && hack/create-kind-cluster.sh )
```

Same nftables branch as Arm A, on context `kind-kind`.

```bash
matches="$(docker exec kind-control-plane cat /proc/net/ip_tables_matches 2>/dev/null || true)"
printf '%s\n' "${matches}"
if ! printf '%s\n' "${matches}" | grep -qx 'statistic'; then
  mode="$(kubectl --context kind-kind -n kube-system get configmap kube-proxy -o jsonpath='{.data.config\.conf}' | awk '/^mode:/{print $2; exit}')"
  echo "kube-proxy mode: ${mode}"
  if [[ "${mode}" != "nftables" ]]; then
    kubectl --context kind-kind -n kube-system get configmap kube-proxy -o json \
      | python3 -c 'import json,sys; cm=json.load(sys.stdin); cm["data"]["config.conf"]=cm["data"]["config.conf"].replace("mode: iptables","mode: nftables",1); json.dump(cm, sys.stdout)' \
      | kubectl --context kind-kind apply -f -
    kubectl --context kind-kind -n kube-system delete pod -l k8s-app=kube-proxy --wait=false
    kubectl --context kind-kind -n kube-system rollout status daemonset/kube-proxy --timeout=180s
  fi
fi
```

Check the node.

```bash
kubectl --context kind-kind get nodes
docker inspect -f '{{.State.Running}}' kind-registry
```

`rev-parse` must print `3d3b92921bd68931c509e1b5bd57df00e76ffff0`. The kind run pastes the node check here.

[Back: Arm A score](05-arm-a-score.md)

[Next: Substrate install](07-substrate-install.md)
