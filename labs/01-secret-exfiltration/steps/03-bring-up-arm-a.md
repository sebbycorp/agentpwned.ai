---
title: Bring up Arm A
summary: Create the bare kind cluster and put a fake vendor key in the agent process.
---

## What we are about to do

Build the lab image, create kind cluster `lab01-bare`, and deploy the sink, the stand-in vendor API, and the agent that holds the canary.

## Why it matters

Arm A is the deployment whose secrecy fails. The key is in the process. kind's default CNI (kindnet) does not enforce Kubernetes NetworkPolicy, so the agent can reach the sink because nothing in the cluster stops it. The agent process is the only client-side limit, and it allows this sink.

Arm B replaces this cluster. Score Arm A before you start Arm B, or use a second machine.

## Command

From the repo root:

```bash
labs/01-secret-exfiltration/scripts/arm-a-up.sh
```

That builds `lab01-agent:local`, creates the cluster, loads the image, and deploys:

| Namespace | What |
| --- | --- |
| `lab01-shared` | `attacker-sink`. `POST /exfil` records the body. It never calls out |
| `lab01` | `legit-api`. A stand-in vendor API that records the `Authorization` header it received |
| `lab01-bare` | `vulnerable-agent`. Env `CANARY_API_KEY` and file `/secrets/api_key` come from Secret `vendor-api-token` |

## On the board

The key is now inside the agent.

![Frame 2 adds the key inside the agent](../diagrams/02-secret.svg)

## What you should see

The script finishes with the three namespaces above. The canary looks like `lab01_canary_` plus 24 hex characters. The script writes a copy to `labs/01-secret-exfiltration/results/bare-canary.txt` (mode 600). Scoring reads the Secret from the cluster, not that file. Do not paste the canary into a ticket or a chat.

## Checkpoint

Where does Arm A store the canary, and what does kindnet refuse to enforce?

## Continue

[Back: Prerequisites](02-prerequisites.md)

[Next: Attack the bare agent](04-attack-the-bare-agent.md)
