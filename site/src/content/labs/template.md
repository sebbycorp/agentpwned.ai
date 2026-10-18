---
title: Lab page template
summary: The page shape every lab uses. Copy this file when you add a lab. Readers do not run the template.
order: 0
status: template
kind: template
---

Copy `template.md` to `NN-short-name.md` and replace this guidance with the lab. Keep the seven headings below, in this order. Frontmatter for a new lab looks like this:

```yaml
title: Short lab title
summary: One or two sentences a reader can scan on the labs index.
order: 4
status: coming-soon
kind: lab
```

## Objectives

State what the reader can show when they finish. Write outcomes, not a tour of tools. One to three sentences is enough. If a control is described here before the lab ships, say that the setup is coming in the lab.

## Prerequisites

List the concepts, tools, and earlier labs a reader needs. Name versions only when you have checked them. If one lab depends on another, link that lab.

## Setup

Explain how to bring up the isolated local environment. When the lab compares a bare agent with a sandboxed one, describe both copies here. Put commands in fenced blocks once the lab is ready. Until then, say the commands are coming in the lab.

## Attack

Describe the exercise against the bare agent. State the goal, what the reader sends, and what they should observe. Do not paste an injection or a collector until the lab is published. Remind the reader that the attack stays inside the isolated local lab environment.

## Defend

Repeat the exercise with the sandbox boundary in place. Name the control that changed, such as credential injection or an egress allowlist, and say what the reader should observe this time. If the policy files are not in the repo yet, say they are coming in the lab.

## Measure

List the questions to record for both runs, and how a score is produced. If the scorer is not in the repo yet, say so. Do not invent numbers, sample scores, or quotes.

## Cleanup

Say how to stop local processes and delete canaries, collectors, and other lab files. Commands belong here when the lab is ready.
