---
title: Substrate install
summary: Push the lab image, then run the two hack/install-ate-kind.sh commands the script runs.
canary: outside the actor
sink: empty
legit: not called
plane: envoy
---

![Envoy injects the key and blocks the sink.](../diagrams/story-06-envoy.svg)

Build and push the actor image to the kind registry. Keep the digest line. The actor template needs `localhost:5001/lab01-agent@` plus that digest.

```bash
export SUBSTRATE_SRC="${SUBSTRATE_SRC:-${HOME}/.cache/agentpwned/substrate}"
docker build -t localhost:5001/lab01-agent:local labs/01-secret-exfiltration/agent
push_log="$(docker push localhost:5001/lab01-agent:local)"
printf '%s\n' "${push_log}"
digest="$(printf '%s\n' "${push_log}" | awk '/digest: sha256:/ {print $3}' | tail -1)"
echo "Actor image localhost:5001/lab01-agent@${digest}"
test -n "${digest}"
```

The script exports these, and it does not pass `--atenet-dataplane`, so v0.5.0 stays on Envoy.

```bash
export KO_DOCKER_REPO="${KO_DOCKER_REPO:-localhost:5001}"
export GOMAXPROCS="${GOMAXPROCS:-2}"
export PATH="/usr/local/go/bin:${HOME}/.local/bin:${PATH}"
```

Kernels without the iptables `multiport` match cannot start atelet while it publishes a hostPort. The script drops that hostPort in the background while the installer applies the DaemonSet. Substrate dials the atelet pod IP.

```bash
matches="$(docker exec kind-control-plane cat /proc/net/ip_tables_matches 2>/dev/null || true)"
if ! printf '%s\n' "${matches}" | grep -qx multiport; then
  (
    for _ in $(seq 1 400); do
      host_port="$(kubectl --context kind-kind -n ate-system get ds atelet -o jsonpath='{.spec.template.spec.containers[0].ports[0].hostPort}' 2>/dev/null || true)"
      if [[ -n "${host_port}" ]]; then
        kubectl --context kind-kind -n ate-system patch ds atelet --type json \
          -p '[{"op":"remove","path":"/spec/template/spec/containers/0/ports/0/hostPort"}]' >/dev/null
        echo "removed atelet hostPort ${host_port}"
      fi
      sleep 2
    done
  ) &
fi
```

Install the system, then the egress demo. These are the flags `arm-b-up.sh` passes.

```bash
(
  cd "${SUBSTRATE_SRC}"
  hack/install-ate-kind.sh \
    --deploy-ate-system \
    --credential-provider='{"name":"k8s.io"}' \
    --rollout-timeout=15m
  hack/install-ate-kind.sh --deploy-demo-egress --rollout-timeout=15m
)
```

Install `kubectl-ate` and shrink the worker pool to one replica.

```bash
mkdir -p "${HOME}/.local/bin"
( cd "${SUBSTRATE_SRC}" && GOBIN="${HOME}/.local/bin" go install ./cmd/kubectl-ate )
kubectl --context kind-kind -n ate-demo-egress patch workerpool egress \
  --type merge -p '{"spec":{"replicas":1}}'
```

Check the egress Deployment and the worker pool.

```bash
kubectl --context kind-kind -n ate-system get deploy atenet-egress
kubectl --context kind-kind -n ate-demo-egress get workerpool egress
```

[Back: Substrate cluster](06-substrate-kind.md)

[Next: Arm B services](08-arm-b-services.md)
