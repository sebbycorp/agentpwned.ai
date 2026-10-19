---
title: Substrate install
summary: Check out the pin, create the kind cluster, push the image, then install agentgateway.
canary: not placed
server: idle
legit: idle
plane: agentgateway
---

![Sandbox beside state.](../diagrams/story-01-two-layers.svg)

<p class="because"><b>What this does.</b> Fetch commit <code>3d3b92921bd68931c509e1b5bd57df00e76ffff0</code>, create cluster <code>lab02-sandboxed</code>, push the lab image, pin the agentgateway digest, and run the kind installer. <b>Why it matters.</b> v0.5.0 plus its pinned agentgateway returns HTTP 403 <code>name: Required value</code>. This lab does not use that pair. The installer still lists an older image until you rewrite it.</p>
<details class="why">
<summary>Why?</summary>
<p><code>sandboxed-up.sh</code> deletes <code>lab02-bare</code> first so one machine is not running both clusters. A tag clone cannot select this commit, so the fetch uses the full SHA. <code>pin_agentgateway_image</code> rewrites both image lines to <code>cr.agentgateway.dev/agentgateway@sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f</code> before install. Revision <code>955d56f</code> includes the worker identity fix. The image and this Substrate commit are pre-1.0. <code>--atenet-dataplane=agentgateway</code> selects ingress and egress together. The credential provider is <code>k8s.io</code>. Keep the digest line from <code>docker push</code>. The next page substitutes it into the actor template. <code>hack/create-kind-cluster.sh</code> deletes an existing cluster of the same name.</p>
</details>

`sandboxed-up.sh` deletes `lab02-bare` so this machine has room for Substrate.

```bash
export PATH="/usr/local/go/bin:${HOME}/.local/bin:${PATH}"
if kind get clusters 2>/dev/null | grep -qx lab02-bare; then
  kind delete cluster --name lab02-bare || true
fi
```

Fetch the pinned commit. The default path is `$HOME/.cache/agentpwned/substrate`.

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
test "$(git -C "${SUBSTRATE_SRC}" rev-parse HEAD)" = "${SUBSTRATE_REF}"
```

Create the kind cluster and the local registry.

```bash
export KIND_CLUSTER_NAME=lab02-sandboxed
export KUBECTL_CONTEXT=kind-lab02-sandboxed
( cd "${SUBSTRATE_SRC}" && hack/create-kind-cluster.sh )
```

Switch kube-proxy to nftables when the iptables statistic match is missing. That is the same helper as Lab 01.

```bash
matches="$(docker exec lab02-sandboxed-control-plane cat /proc/net/ip_tables_matches 2>/dev/null || true)"
if ! printf '%s\n' "${matches}" | grep -qx 'statistic'; then
  mode="$(kubectl --context kind-lab02-sandboxed -n kube-system get configmap kube-proxy -o jsonpath='{.data.config\.conf}' | awk '/^mode:/{print $2; exit}')"
  echo "kube-proxy mode: ${mode}"
  if [[ "${mode}" != "nftables" ]]; then
    kubectl --context kind-lab02-sandboxed -n kube-system get configmap kube-proxy -o json \
      | python3 -c 'import json,sys; cm=json.load(sys.stdin); cm["data"]["config.conf"]=cm["data"]["config.conf"].replace("mode: iptables","mode: nftables",1); json.dump(cm, sys.stdout)' \
      | kubectl --context kind-lab02-sandboxed apply -f -
    kubectl --context kind-lab02-sandboxed -n kube-system delete pod -l k8s-app=kube-proxy --wait=false
    kubectl --context kind-lab02-sandboxed -n kube-system rollout status daemonset/kube-proxy --timeout=180s
  fi
fi
```

Build and push the actor image. Keep `digest`. The next page needs `localhost:5001/lab02-agent@` plus that value.

```bash
docker build -t localhost:5001/lab02-agent:local labs/02-sleeper-memory/agent
push_log="$(docker push localhost:5001/lab02-agent:local)"
printf '%s\n' "${push_log}"
digest="$(printf '%s\n' "${push_log}" | awk '/digest: sha256:/ {print $3}' | tail -1)"
echo "Actor image localhost:5001/lab02-agent@${digest}"
test -n "${digest}"
```

Pin both agentgateway image lines, then export the build settings.

```bash
export AGENTGATEWAY_IMAGE="${AGENTGATEWAY_IMAGE:-cr.agentgateway.dev/agentgateway@sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f}"
python3 - "${SUBSTRATE_SRC}/manifests/ate-install/components/agentgateway/kustomization.yaml" "${AGENTGATEWAY_IMAGE}" <<'END'
import pathlib, sys
path, image = sys.argv[1:]
file = pathlib.Path(path)
lines = file.read_text().splitlines(keepends=True)
count = 0
out = []
for line in lines:
    stripped = line.lstrip()
    if stripped.startswith("image: cr.agentgateway.dev/agentgateway"):
        indent = line[: len(line) - len(stripped)]
        newline = "\n" if line.endswith("\n") else ""
        out.append(f"{indent}image: {image}{newline}")
        count += 1
    else:
        out.append(line)
if count != 2:
    sys.exit(f"expected 2 agentgateway image lines, found {count}")
file.write_text("".join(out))
print(f"pinned {count} agentgateway image lines")
END
export KO_DOCKER_REPO="${KO_DOCKER_REPO:-localhost:5001}"
export GOMAXPROCS="${GOMAXPROCS:-2}"
```

Kernels without the iptables `multiport` match cannot start atelet while it publishes a hostPort. Drop that hostPort while the installer applies the DaemonSet.

```bash
matches="$(docker exec lab02-sandboxed-control-plane cat /proc/net/ip_tables_matches 2>/dev/null || true)"
if ! printf '%s\n' "${matches}" | grep -qx multiport; then
  (
    for _ in $(seq 1 400); do
      host_port="$(kubectl --context kind-lab02-sandboxed -n ate-system get ds atelet -o jsonpath='{.spec.template.spec.containers[0].ports[0].hostPort}' 2>/dev/null || true)"
      if [[ -n "${host_port}" ]]; then
        kubectl --context kind-lab02-sandboxed -n ate-system patch ds atelet --type json \
          -p '[{"op":"remove","path":"/spec/template/spec/containers/0/ports/0/hostPort"}]' >/dev/null
        echo "removed atelet hostPort ${host_port}"
      fi
      sleep 2
    done
  ) &
fi
```

Install the system, then the egress demo.

```bash
(
  cd "${SUBSTRATE_SRC}"
  hack/install-ate-kind.sh \
    --deploy-ate-system \
    --atenet-dataplane=agentgateway \
    --credential-provider='{"name":"k8s.io"}' \
    --rollout-timeout=15m
  hack/install-ate-kind.sh --deploy-demo-egress --rollout-timeout=15m
)
```

Install `kubectl-ate` and shrink the worker pool to one replica.

```bash
mkdir -p "${HOME}/.local/bin"
( cd "${SUBSTRATE_SRC}" && GOBIN="${HOME}/.local/bin" go install ./cmd/kubectl-ate )
kubectl --context kind-lab02-sandboxed -n ate-demo-egress patch workerpool egress \
  --type merge -p '{"spec":{"replicas":1}}'
kubectl --context kind-lab02-sandboxed -n ate-system get deploy atenet-egress
kubectl --context kind-lab02-sandboxed -n ate-demo-egress get workerpool egress
```

[Back: Bare agent score](06-bare-score.md)

[Next: Sandboxed agent actor](08-sandboxed-actor.md)
