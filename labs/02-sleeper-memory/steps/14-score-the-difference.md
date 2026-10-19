---
title: The difference
summary: Three scorecards from the clusters. Bare leaked. Sandboxed blocked. Recovered did not try.
canary: compare
server: compare
legit: compare
plane: agentgateway
---

![Bare leak beside a recovered actor.](../diagrams/story-09-score.svg)

```bash
labs/02-sleeper-memory/scripts/score.sh sandboxed
labs/02-sleeper-memory/scripts/score.sh recovered
labs/02-sleeper-memory/scripts/score.sh compare \
  labs/02-sleeper-memory/results/bare.json \
  labs/02-sleeper-memory/results/sandboxed.json \
  labs/02-sleeper-memory/results/recovered.json
```

Sandboxed pass at 2026-10-19T11:37:56Z: poison still in memory after resume, `boot_id` `5145fe71` continued, session 2 tried the callback, the attacker server has zero copies of that canary, `egress_denies` 1, the vendor canary was injected only on the legit hop.

Recovered pass at 2026-10-19T11:37:24Z: memory has no `preferred_callback`, session 2 made no callback attempt, `sourceTag` was `known-good`, injection still works.

```text
Lab 02 scorecard  agent=sandboxed  exercise=PASS
egress_denies                            1
session2_attacker_hits                   0
in_ram_counter_continued                 true
injection_demo                           pass

Lab 02 scorecard  agent=recovered  exercise=PASS
memory_contains_preferred_callback       false
session2_callback_attempts               0
recovered_from_tag                       true
injection_demo                           pass
```

[Back: Put it back](13-recover.md)

[Next: Deputy, then tear down](15-challenge-and-cleanup.md)
