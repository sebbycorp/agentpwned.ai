---
title: Substrate cluster
summary: Drop Arm A if it is up, clone Substrate v0.5.0, and create the kind cluster the installer expects.
canary: outside the actor
sink: empty
legit: not called
plane: none
---

![Canary stays outside the actor.](../diagrams/story-06-setup.svg)

<p class="because"><b>What this does.</b> Delete Arm A, then run Substrate's kind script with no extra flags. <b>Why it matters.</b> That script creates the cluster named <code>kind</code> and a registry on <code>127.0.0.1:5001</code>, which is where Arm B pushes images. Substrate v0.5.0 is pre-1.0, and this lab pins tag v0.5.0, commit <code>e8d40c33</code>.</p>
<details class="why">
<summary>Why?</summary>
<p><code>arm-b-up.sh</code> deletes <code>lab01-bare</code> first so one machine is not running both clusters. The clone is skipped when <code>~/.cache/agentpwned/substrate</code> already has a <code>.git</code> directory. Substrate's kind config uses kube-proxy iptables mode. The same nftables branch as Arm A switches it when the statistic match is missing. That switch is a kernel workaround, not a Substrate feature.</p>
</details>

`arm-b-up.sh` deletes `lab01-bare` so this machine has room for Substrate.

```bash
if kind get clusters 2>/dev/null | grep -qx lab01-bare; then
  kind delete cluster --name lab01-bare || true
fi
```

Clone v0.5.0 when the checkout has no `.git` directory. The default path is `$HOME/.cache/agentpwned/substrate`.

```bash
export SUBSTRATE_REF="${SUBSTRATE_REF:-v0.5.0}"
export SUBSTRATE_SRC="${SUBSTRATE_SRC:-${HOME}/.cache/agentpwned/substrate}"
if [[ ! -d "${SUBSTRATE_SRC}/.git" ]]; then
  mkdir -p "$(dirname "${SUBSTRATE_SRC}")"
  git clone --depth 1 --branch "${SUBSTRATE_REF}" https://github.com/agent-substrate/substrate.git "${SUBSTRATE_SRC}"
fi
git -C "${SUBSTRATE_SRC}" rev-parse HEAD
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

Checkout on this run: `e8d40c33f96f4b7a4984bfea7334a36ab5b45b7b`. The nftables branch saw `kube-proxy mode: iptables`, patched the ConfigMap, and rolled kube-proxy. The node check then printed NotReady at age 11s. The registry container was running. The node was Ready before the install rollouts on the next page.

```text
NAME                 STATUS     ROLES           AGE   VERSION
kind-control-plane   NotReady   control-plane   11s   v1.37.0
true
```

[Back: Arm A score](05-arm-a-score.md)

[Next: Substrate install](07-substrate-install.md)
