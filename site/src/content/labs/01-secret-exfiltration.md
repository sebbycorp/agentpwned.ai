---
title: Secret Exfiltration
summary: A bare agent leaks a canary API key through prompt injection. In the sandbox, credential injection and an egress allowlist are what keep the key hidden. Runnable steps are coming in the lab.
order: 1
status: coming-soon
kind: lab
---

## Objectives

Show that a bare agent can be talked into sending a canary API key off the machine, and that the same attempt fails once the key is kept outside the process. You will compare one agent with the canary in its environment and the network open, against the same agent in a sandbox. Runnable steps are coming in the lab.

## Prerequisites

A local environment you can throw away. You should know that an agent can call tools, and that untrusted text can carry extra instructions. Exact tool versions, and the Agent Substrate and kagent SandboxAgent install, are coming in the lab.

## Setup

You will start two copies of the same agent. The bare copy holds a canary key and can open outbound connections. The sandboxed copy does not hold the key. Credential injection attaches the key only on an approved request, from outside the process, and an egress allowlist limits the destinations. The commands and policy files are coming in the lab.

## Attack

You will give the bare agent a prompt injection that asks it to read the canary and send the value to a collector that exists only inside this lab. The observation to record is whether the canary arrives. The injection text and the collector are coming in the lab. Run this only in the isolated local environment.

## Defend

You will send the same class of injection to the sandboxed agent. The result to look for is that the process never holds the key, and that the allowlist refuses a destination that is not approved. How the sandbox is drawn with Agent Substrate and kagent SandboxAgent is coming in the lab.

## Measure

Score both runs with the same questions. Did the canary leave? Which destinations were contacted? What could the agent still do? The scoring steps are coming in the lab. This page does not publish sample scores.

## Cleanup

Stop the local agents and delete the canary, the collector, and any lab files created during setup. The commands are coming in the lab.
