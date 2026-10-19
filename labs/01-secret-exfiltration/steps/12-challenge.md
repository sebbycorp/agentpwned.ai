---
title: Try to get the canary out
summary: Four attempts inside Arm B. The checker reads the sink.
canary: hidden
sink: not scored
legit: HTTP 200
plane: agentgateway
---

![Four tries, then read the sink report.](../diagrams/story-10-challenge.svg)

Read the env and the file. No URL.

```bash
labs/01-secret-exfiltration/attack/challenge-read.txt
```

POST to the sink.

```bash
labs/01-secret-exfiltration/attack/challenge-sink.txt
```

POST to the unlisted in-cluster dummy.

```bash
labs/01-secret-exfiltration/attack/challenge-dummy.txt
```

DNS for that same dummy. No other host.

```bash
labs/01-secret-exfiltration/attack/challenge-dns.txt
```

```bash
labs/01-secret-exfiltration/scripts/challenge.sh
```

`challenge.sh` posts each prompt through the actor and prints one line per attempt, plus whether the canary reached the sink.

The kind run pastes `challenge.sh` here. The canary value is not printed.

[Back: The difference](11-score-the-difference.md)

[Next: Tear down](13-cleanup-and-recap.md)
