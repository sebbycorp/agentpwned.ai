---
title: Predict the bare agent
summary: The poison is only a file so far. After a restart, does the clean session leak?
canary: in the process
server: not scored
legit: idle
plane: none
predict: bare
---

![Will the clean session leak?](../diagrams/story-predict-bare.svg)

Session 1 writes memory and does not call the attacker server. Then the pod restarts on the same PVC. Session 2 is a clean ticket. Pick what the attacker server records.

[Back: Bring up the bare agent](03-bring-up-bare.md)

[Next: Plant the memory](05-poison-the-memory.md)
