.PHONY: test lab01-arm-a-up lab01-arm-a-attack lab01-arm-a-score lab01-arm-a-down \
	lab01-arm-b-up lab01-arm-b-attack lab01-arm-b-score lab01-arm-b-down lab01-compare

LAB := labs/01-secret-exfiltration

test:
	cd scoring && python3 -m unittest discover -v

lab01-arm-a-up:
	$(LAB)/scripts/arm-a-up.sh

lab01-arm-a-attack:
	$(LAB)/scripts/arm-a-attack.sh

lab01-arm-a-score:
	$(LAB)/scripts/score.sh bare

lab01-arm-a-down:
	$(LAB)/scripts/arm-a-down.sh

lab01-arm-b-up:
	$(LAB)/scripts/arm-b-up.sh

lab01-arm-b-attack:
	$(LAB)/scripts/arm-b-attack.sh

lab01-arm-b-score:
	$(LAB)/scripts/score.sh substrate

lab01-arm-b-down:
	$(LAB)/scripts/arm-b-down.sh

lab01-compare:
	$(LAB)/scripts/score.sh compare $(LAB)/results/bare.json $(LAB)/results/substrate.json
