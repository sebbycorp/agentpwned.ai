.PHONY: test lab01-bare-up lab01-bare-attack lab01-bare-score lab01-bare-down \
	lab01-sandboxed-up lab01-sandboxed-attack lab01-sandboxed-score lab01-sandboxed-down lab01-compare

LAB := labs/01-secret-exfiltration

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
