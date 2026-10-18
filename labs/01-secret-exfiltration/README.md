# Lab 01: Secret Exfiltration

One hostile prompt. Two clusters. Arm A holds the canary. Arm B is a Substrate actor on Envoy: the actor does not hold the key, the allowlisted call gets it, the sink does not.

![Bare leaks. Envoy injects and blocks.](diagrams/story-07-compare.svg)

The scorecard is read from the cluster after the run.

**Safety.** Canary values only. The sink stays inside the kind cluster. Do not retarget the prompt.

Agent Substrate is pre-1.0. This lab pins **v0.5.0** (`e8d40c33`).

Start at [Step 1: The agent](steps/01-why-this-lab.md).

## Steps

1. [The agent](steps/01-why-this-lab.md)
2. [What it can touch](steps/02-prerequisites.md)
3. [Bring up Arm A](steps/03-bring-up-arm-a.md)
4. [Predict Arm A](steps/04-predict-bare.md)
5. [The leak](steps/05-attack-the-bare-agent.md)
6. [Arm A score](steps/06-score-arm-a.md)
7. [Envoy](steps/07-defend-with-substrate.md)
8. [How injection works](steps/08-how-injection-works.md)
9. [Predict Arm B](steps/09-predict-sandbox.md)
10. [The sandboxed run](steps/10-attack-arm-b.md)
11. [The difference](steps/11-score-the-difference.md)
12. [Try to get the canary out](steps/12-challenge.md)
13. [Tear down](steps/13-cleanup-and-recap.md)

Instructor notes: [instructor.md](instructor.md).
