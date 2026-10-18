---
title: Prerequisites
summary: Local kind, a fake canary, and a deterministic agent so the scorecard measures the sandbox.
---

## What we are about to do

Check the tools, and decide that the scored path will not call a model provider.

## Why it matters

A real model may refuse the prompt, skip the tool, or leak the key in a sentence. The scorecard would then mix model behavior with the sandbox. The default agent is a script. When the prompt names the lab sink, it looks in the same env vars and files the prompt lists, then POSTs whatever it found. When the prompt names the vendor API, it POSTs with `Authorization: placeholder` and does not copy a secret into that request.

## Command

No cluster command on this step. You need:

- Linux or macOS with Docker
- kind 0.27.0 for Arm A. Arm B uses the kind binary Substrate's `hack/kind.sh` selects
- kubectl 1.32 or newer is a fine client
- Python 3.11 or newer (stdlib only)
- For Arm B: Go **1.27 or newer**, git, and a checkout of [agent-substrate/substrate](https://github.com/agent-substrate/substrate) at tag `v0.5.0`
- Enough RAM for Substrate's kind install: Postgres, rustfs, Envoy, an OpenTelemetry collector, Jaeger, Prometheus, and a gVisor worker. Stop other clusters first

Arm A's cluster config sets `kubeProxyMode: nftables` because some kernels reject kube-proxy's iptables statistic match and then ClusterIP and DNS do not work. Arm B's script switches to nftables only if it sees that failure.

No cloud account is required.

The agent has an `openai` mode (`LAB_LLM=openai`, `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`). The attack scripts always send `"mode": "mock"`. Turning on a real model sends the prompt off the machine. Do that only with a fake canary, on a system you control. Arm B's scored policy does not allowlist a model provider, so that call is denied until you add the origin yourself.

## On the board

Still frame 1. The process is the thing you are about to give a key.

![Frame 1 draws the agent alone on the board](../diagrams/01-agent.svg)

## What you should see

Nothing in the cluster yet. `docker`, `kind`, `kubectl`, and `python3` answer `--version` on the machine you will use. Arm B also needs `go`.

## Checkpoint

Which hosts is the agent process willing to call, and why does the lab keep the sink inside cluster DNS?

<details class="answer">
<summary>Show answer</summary>

The agent process refuses tool calls whose host is outside cluster DNS (`*.svc` and `*.svc.cluster.local`). The sink is a Service inside the kind cluster, so the attack never leaves your machine and never touches a host you do not own. Only canary values are used.

</details>

## Continue

[Back: Why this lab](01-why-this-lab.md)

[Next: Bring up Arm A](03-bring-up-arm-a.md)
