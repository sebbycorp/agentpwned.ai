.PHONY: test lab01-bare-up lab01-bare-attack lab01-bare-score lab01-bare-down \
	lab01-sandboxed-up lab01-sandboxed-attack lab01-sandboxed-score lab01-sandboxed-down lab01-compare \
	lab02-bare-up lab02-bare-attack lab02-bare-score lab02-bare-down \
	lab02-sandboxed-up lab02-sandboxed-attack lab02-sandboxed-recover lab02-sandboxed-score \
	lab02-sandboxed-down lab02-challenge lab02-compare

LAB := labs/01-secret-exfiltration
LAB02 := labs/02-sleeper-memory

test:
	cd scoring && python3 -m unittest discover -v

lab01-bare-up:
	$(LAB)/scripts/bare-up.sh

lab01-bare-attack:
	$(LAB)/scripts/bare-attack.sh

lab01-bare-score:
	$(LAB)/scripts/score.sh bare

lab01-bare-down:
	$(LAB)/scripts/bare-down.sh

lab01-sandboxed-up:
	$(LAB)/scripts/sandboxed-up.sh

lab01-sandboxed-attack:
	$(LAB)/scripts/sandboxed-attack.sh

lab01-sandboxed-score:
	$(LAB)/scripts/score.sh sandboxed

lab01-sandboxed-down:
	$(LAB)/scripts/sandboxed-down.sh

lab01-compare:
	$(LAB)/scripts/score.sh compare $(LAB)/results/bare.json $(LAB)/results/sandboxed.json

lab02-bare-up:
	$(LAB02)/scripts/bare-up.sh

lab02-bare-attack:
	$(LAB02)/scripts/bare-attack.sh all

lab02-bare-score:
	$(LAB02)/scripts/score.sh bare

lab02-bare-down:
	$(LAB02)/scripts/bare-down.sh

lab02-sandboxed-up:
	$(LAB02)/scripts/sandboxed-up.sh

lab02-sandboxed-attack:
	$(LAB02)/scripts/sandboxed-attack.sh all

lab02-sandboxed-recover:
	$(LAB02)/scripts/sandboxed-recover.sh

lab02-sandboxed-score:
	$(LAB02)/scripts/score.sh sandboxed

lab02-sandboxed-down:
	$(LAB02)/scripts/sandboxed-down.sh

lab02-challenge:
	$(LAB02)/scripts/challenge.sh

lab02-compare:
	$(LAB02)/scripts/score.sh compare $(LAB02)/results/bare.json $(LAB02)/results/sandboxed.json $(LAB02)/results/recovered.json
