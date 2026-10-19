---
title: Arm A cluster
summary: Build the image, create kind cluster lab01-bare, then load the image.
canary: not placed
sink: idle
legit: idle
plane: none
---

![Canary inside the agent.](../diagrams/story-03-hold.svg)

<p class="because"><b>What this does.</b> Build the agent image, start a kind cluster named <code>lab01-bare</code>, and copy the image onto that node. <b>Why it matters.</b> Later pods use <code>lab01-agent:local</code> from the node, not from the internet. <code>kubeProxyMode: nftables</code> is a kind setting: this kernel rejects the iptables statistic match, and then Service IPs and in-cluster DNS do not work.</p>
<details class="why">
<summary>Why?</summary>
<p>A kind cluster is one Kubernetes control plane inside a container. Arm A is the cluster that will hold the canary inside the agent. <code>kind load</code> copies the image into the node. If that fails, the script imports it with <code>ctr</code> and retags it to <code>docker.io/library/lab01-agent:local</code>, the name the Deployments pull. On this hand run, kind load succeeded on the v1.32.2 node.</p>
</details>

Build the agent image. `arm-a-up.sh` tags it `lab01-agent:local`.

```bash
docker build -t lab01-agent:local labs/01-secret-exfiltration/agent
```

Create the cluster when `kind get clusters` does not already list `lab01-bare`. This is the config the script passes.

```yaml
# Arm A kind cluster.
# kubeProxyMode nftables avoids the iptables "statistic" match. Some kernels
# (including the one this lab was authored on, 6.12.94+) reject that match,
# and then ClusterIP and in-cluster DNS never work. nftables mode is a kind
# setting, not a Substrate feature. kind 0.27+ accepts it.
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  kubeProxyMode: nftables # How pods reach Service IPs. iptables mode fails on this kernel.
nodes:
  - role: control-plane
```

```bash
kind create cluster --name lab01-bare --config labs/01-secret-exfiltration/k8s/kind-arm-a.yaml
```

If the node has no iptables `statistic` match, switch kube-proxy to nftables. This is the branch `ensure_cluster_services` takes. Skip the patch when the mode is already nftables.

```bash
matches="$(docker exec lab01-bare-control-plane cat /proc/net/ip_tables_matches 2>/dev/null || true)"
printf '%s\n' "${matches}"
if ! printf '%s\n' "${matches}" | grep -qx 'statistic'; then
  mode="$(kubectl --context kind-lab01-bare -n kube-system get configmap kube-proxy -o jsonpath='{.data.config\.conf}' | awk '/^mode:/{print $2; exit}')"
  echo "kube-proxy mode: ${mode}"
  if [[ "${mode}" != "nftables" ]]; then
    kubectl --context kind-lab01-bare -n kube-system get configmap kube-proxy -o json \
      | python3 -c 'import json,sys; cm=json.load(sys.stdin); cm["data"]["config.conf"]=cm["data"]["config.conf"].replace("mode: iptables","mode: nftables",1); json.dump(cm, sys.stdout)' \
      | kubectl --context kind-lab01-bare apply -f -
    kubectl --context kind-lab01-bare -n kube-system delete pod -l k8s-app=kube-proxy --wait=false
    kubectl --context kind-lab01-bare -n kube-system rollout status daemonset/kube-proxy --timeout=180s
  fi
fi
```

Load the image into the cluster. If `kind load` fails, import it with `ctr` and retag it to `docker.io/library/lab01-agent:local`. That is `load_kind_image` in `arm-a-up.sh`.

```bash
if ! kind load docker-image lab01-agent:local --name lab01-bare; then
  docker save lab01-agent:local | docker exec -i lab01-bare-control-plane ctr -n k8s.io images import -
  docker exec lab01-bare-control-plane ctr -n k8s.io images tag \
    lab01-agent:local docker.io/library/lab01-agent:local
fi
```

Check the node and the proxy mode.

```bash
kubectl --context kind-lab01-bare get nodes
kubectl --context kind-lab01-bare -n kube-system get configmap kube-proxy -o jsonpath='{.data.config\.conf}' | awk '/^mode:/{print}'
```

This machine already listed `lab01-bare`, so create was skipped. The proxy mode was already nftables, so the patch was skipped. `kind load` succeeded. The check printed:

```text
NAME                       STATUS   ROLES           AGE   VERSION
lab01-bare-control-plane   Ready    control-plane   7m    v1.32.2
mode: nftables
```

[Back: Prerequisites](01-prerequisites.md)

[Next: Arm A workloads](03-arm-a-workloads.md)
