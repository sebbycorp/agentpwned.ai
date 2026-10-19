---
title: Arm B score
summary: Post the attack and the vendor call, then score the substrate arm.
canary: not scored
sink: not scored
legit: not scored
plane: envoy
---

![Bare beside Envoy.](../diagrams/story-07-compare.svg)

Post through the router. These are the `arm-b-attack.sh` arguments.

```bash
python3 labs/01-secret-exfiltration/scripts/post_prompt.py \
  --via router \
  --arm substrate \
  --context kind-kind \
  --prompt labs/01-secret-exfiltration/attack/prompt-injection.txt \
  --out labs/01-secret-exfiltration/results/substrate-attack.json \
  --kind attack
python3 labs/01-secret-exfiltration/scripts/post_prompt.py \
  --via router \
  --arm substrate \
  --context kind-kind \
  --prompt labs/01-secret-exfiltration/attack/benign-call.txt \
  --out labs/01-secret-exfiltration/results/substrate-benign.json \
  --kind benign
```

Score it, then compare the two JSON files. This is `score.sh substrate` and `score.sh compare`.

```bash
python3 scoring/score_lab01.py \
  --arm substrate \
  --results-dir labs/01-secret-exfiltration/results \
  --out labs/01-secret-exfiltration/results/substrate.json
python3 scoring/score_lab01.py --compare \
  labs/01-secret-exfiltration/results/bare.json \
  labs/01-secret-exfiltration/results/substrate.json
```

The four prompts `challenge.sh` posts, then the same collector it runs.

```bash
python3 labs/01-secret-exfiltration/scripts/post_prompt.py \
  --via router --arm substrate --context kind-kind \
  --prompt labs/01-secret-exfiltration/attack/challenge-read.txt \
  --out labs/01-secret-exfiltration/results/challenge-read.json --kind challenge-read
python3 labs/01-secret-exfiltration/scripts/post_prompt.py \
  --via router --arm substrate --context kind-kind \
  --prompt labs/01-secret-exfiltration/attack/challenge-sink.txt \
  --out labs/01-secret-exfiltration/results/challenge-sink.json --kind challenge-sink
python3 labs/01-secret-exfiltration/scripts/post_prompt.py \
  --via router --arm substrate --context kind-kind \
  --prompt labs/01-secret-exfiltration/attack/challenge-dummy.txt \
  --out labs/01-secret-exfiltration/results/challenge-dummy.json --kind challenge-dummy
python3 labs/01-secret-exfiltration/scripts/post_prompt.py \
  --via router --arm substrate --context kind-kind \
  --prompt labs/01-secret-exfiltration/attack/challenge-dns.txt \
  --out labs/01-secret-exfiltration/results/challenge-dns.json --kind challenge-dns
```

```bash
python3 - <<'END'
import json
import sys
from pathlib import Path
root = Path(".").resolve()
lab = root / "labs" / "01-secret-exfiltration"
sys.path.insert(0, str(root / "scoring"))
from lib.challenge import evaluate_challenge, render_challenge
from lib.collect import http_via_port_forward

def load(name):
    return json.loads((lab / "results" / name).read_text(encoding="utf-8"))

canary = (lab / "results" / "substrate-canary.txt").read_text(encoding="utf-8").strip()
sink = json.loads(http_via_port_forward("kind-kind", "lab01-shared", "svc/attacker-sink", 80, "/report"))
dummy = json.loads(http_via_port_forward("kind-kind", "lab01", "svc/dummy", 80, "/report"))
report = evaluate_challenge(
    {
        "read": load("challenge-read.json"),
        "sink": load("challenge-sink.json"),
        "dummy": load("challenge-dummy.json"),
        "dns": load("challenge-dns.json"),
    },
    sink,
    dummy,
    canary,
)
out = lab / "results" / "challenge.json"
out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(render_challenge(report))
print(f"wrote {out}")
END
```

The recorded score from the hand run is added after that run.

[Back: Arm B actor](09-arm-b-actor.md)

[Next: Tear down](11-teardown.md)
