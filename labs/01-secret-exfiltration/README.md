# Lab 01: Secret Exfiltration

A local kind lab that shows why an AI agent should not hold a long-lived API key, and how Agent Substrate keeps that key out of the actor.

You run one hostile prompt twice. Arm A puts a fake vendor key in the agent process. Arm B runs the same agent as a Substrate actor. The actor has no copy of the key. An egress policy allowlists only the vendor API. The egress gateway injects the key into that call. The sink is not on the allowlist.

The scorecard is computed from the cluster after the run. It is not a canned result.

**Safety.** Canary values only. The sink is a Service inside the kind cluster. Do not retarget the prompt at any host you do not own. The agent process refuses tool calls whose host is outside cluster DNS (`*.svc` and `*.svc.cluster.local`).

Agent Substrate is pre-1.0. This lab pins **v0.5.0** (`e8d40c33`). Behavior can change.

The walkthrough is one step per page. Start at [Step 1: Why this lab](steps/01-why-this-lab.md).

## Steps

1. [Why this lab](steps/01-why-this-lab.md)
2. [Prerequisites](steps/02-prerequisites.md)
3. [Bring up Arm A](steps/03-bring-up-arm-a.md)
4. [Attack the bare agent](steps/04-attack-the-bare-agent.md)
5. [Score Arm A](steps/05-score-arm-a.md)
6. [Defend with Substrate](steps/06-defend-with-substrate.md)
7. [Score the difference](steps/07-score-the-difference.md)
8. [Cleanup and recap](steps/08-cleanup-and-recap.md)

Instructor notes: [instructor.md](instructor.md).
