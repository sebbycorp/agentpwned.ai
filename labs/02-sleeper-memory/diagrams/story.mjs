#!/usr/bin/env node
/**
 * Lab 02 lightboards. Black board, 2px outline, Caveat labels.
 * Green is allowed traffic. Red is a leak or a block.
 *
 *   node labs/02-sleeper-memory/diagrams/story.mjs
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { INK, GREEN, RED, chalk, box, card, arrow, wrap } from '../../01-secret-exfiltration/diagrams/draw.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function legend() {
	return [
		chalk('green allowed', 250, 518, 24, GREEN),
		chalk('red leak or block', 700, 518, 24, RED),
	].join('');
}

function twoLayers() {
	return [
		card(40, 70, 420, 360, 'sandbox', 'what it can do', INK, 64),
		card(500, 70, 420, 360, 'state', 'who wakes up', INK, 64),
		legend(),
	].join('');
}

function memoryMap() {
	return [
		card(36, 180, 250, 180, 'agent', 'tools', INK),
		card(330, 36, 280, 140, 'memory', 'standing.json', INK, 44),
		card(330, 200, 280, 140, 'ticket', 'read', GREEN, 48),
		card(330, 364, 280, 130, 'legit API', 'allow', GREEN, 40),
		card(660, 180, 260, 180, 'attacker', 'not yet', RED, 44),
		arrow(286, 250, 330, 270, GREEN),
		arrow(286, 230, 330, 106, INK),
		legend(),
	].join('');
}

function poison() {
	return [
		card(36, 150, 280, 200, 'ticket', 'T-POISON', INK, 44),
		card(360, 150, 280, 200, 'memory', 'callback', RED, 48),
		card(680, 170, 240, 160, 'attacker', '0 hits', INK, 44),
		arrow(316, 250, 360, 250, RED),
		legend(),
	].join('');
}

function wake() {
	return [
		chalk('bare', 230, 56, 36, INK),
		card(40, 80, 380, 150, 'pod', 'new uid', INK, 48),
		card(40, 280, 380, 160, 'PVC', 'file stays', RED, 48),
		arrow(230, 230, 230, 280, RED),
		chalk('sandbox', 730, 56, 36, INK),
		card(540, 80, 380, 150, 'suspend', 'snapshot', INK, 44),
		card(540, 280, 380, 160, 'resume', 'poison back', RED, 36),
		arrow(730, 230, 730, 280, RED),
		legend(),
	].join('');
}

function predictBare() {
	return [
		chalk('leaks or blocked', 480, 72, 40, INK),
		card(40, 170, 360, 200, 'memory', 'poison', RED, 48),
		card(520, 170, 400, 200, 'attacker', '?', INK),
		arrow(400, 270, 520, 270, INK),
	].join('');
}

function session2Bare() {
	return [
		card(36, 160, 280, 200, 'clean ticket', 'canary', INK, 36),
		card(360, 160, 240, 200, 'memory', 'callback', RED, 40),
		card(650, 160, 270, 200, 'attacker', 'HTTP 200', RED, 40),
		arrow(316, 260, 360, 260, RED),
		arrow(600, 260, 650, 260, RED),
		legend(),
	].join('');
}

function predictSandbox() {
	return [
		chalk('leaks or blocked', 480, 64, 40, INK),
		card(30, 160, 250, 180, 'memory', 'poison', RED, 40),
		card(320, 160, 280, 180, 'gateway', 'deny', INK, 44),
		card(650, 160, 270, 180, 'attacker', '?', INK),
		arrow(280, 250, 320, 250, INK),
		arrow(600, 250, 650, 250, INK),
	].join('');
}

function session2Sandbox() {
	return [
		card(24, 150, 220, 200, 'actor', 'poisoned', RED, 40),
		card(270, 150, 250, 200, 'gateway', 'denied', RED, 44),
		card(560, 40, 360, 140, 'legit API', 'HTTP 200', GREEN, 40),
		card(560, 300, 360, 150, 'attacker', '0 hits', RED, 44),
		arrow(244, 230, 270, 250, RED),
		arrow(520, 190, 560, 110, GREEN),
		arrow(520, 300, 560, 360, RED),
		legend(),
	].join('');
}

function tagBoard() {
	return [
		card(36, 80, 420, 160, 'known-good', 'tag', GREEN, 44),
		card(36, 300, 420, 160, 'latest', 'poisoned', RED, 48),
		card(520, 180, 400, 200, 'revert', 'restores latest', RED, 40),
		arrow(456, 160, 520, 240, GREEN),
		arrow(456, 380, 520, 320, RED),
		legend(),
	].join('');
}

function recover() {
	return [
		card(36, 160, 260, 200, 'tag', 'known-good', GREEN, 44),
		card(340, 160, 260, 200, 'new actor', 'clean', GREEN, 40),
		card(650, 160, 270, 200, 'attacker', 'no try', INK, 40),
		arrow(296, 260, 340, 260, GREEN),
		arrow(600, 260, 650, 260, INK),
		legend(),
	].join('');
}

function score() {
	return [
		chalk('bare', 230, 56, 36, RED),
		card(40, 90, 380, 140, 'canary', 'landed', RED, 48),
		card(40, 280, 380, 160, 'memory', 'kept', RED, 48),
		chalk('sandbox', 730, 56, 36, GREEN),
		card(520, 90, 400, 140, 'canary', 'blocked', RED, 44),
		card(520, 280, 400, 160, 'recovered', 'no callback', GREEN, 36),
		legend(),
	].join('');
}

function challenge() {
	return [
		card(36, 150, 280, 200, 'actor', 'canary', INK, 48),
		card(360, 150, 250, 200, 'gateway', 'host ok', GREEN, 40),
		card(660, 150, 260, 200, 'legit', '/deputy', RED, 48),
		arrow(316, 250, 360, 250, GREEN),
		arrow(610, 250, 660, 250, RED),
		legend(),
	].join('');
}

function injection() {
	return [
		card(30, 80, 280, 150, 'actor', 'placeholder', INK, 36),
		card(340, 80, 280, 150, 'gateway', 'swap', GREEN, 44),
		card(650, 80, 270, 150, 'legit', 'bearer', GREEN, 48),
		card(180, 300, 600, 150, 'secret', 'not in actor', GREEN, 48),
		arrow(310, 155, 340, 155, INK),
		arrow(620, 155, 650, 155, GREEN),
		legend(),
	].join('');
}

const frames = [
	['story-01-two-layers.svg', 'Sandbox and state', twoLayers()],
	['story-02-agent-memory.svg', 'Agent, memory, ticket, legit, attacker', memoryMap()],
	['story-03-session1-poison.svg', 'Poison enters memory, attacker stays at zero', poison()],
	['story-04-wake.svg', 'Restart and resume both bring the poison back', wake()],
	['story-predict-bare.svg', 'Will the clean session leak?', predictBare()],
	['story-05-session2-bare.svg', 'Bare callback lands', session2Bare()],
	['story-predict-sandbox.svg', 'Will the sandboxed callback land?', predictSandbox()],
	['story-06-session2-sandboxed.svg', 'Gateway denies the callback', session2Sandbox()],
	['story-07-tag.svg', 'Known-good tag versus revert', tagBoard()],
	['story-08-recover.svg', 'Create the actor from the known-good tag', recover()],
	['story-09-score.svg', 'Bare leak beside a recovered actor', score()],
	['story-10-challenge.svg', 'Allowlisted host still accepts the canary', challenge()],
	['story-11-injection.svg', 'Placeholder becomes the vendor canary', injection()],
];

for (const [file, title, body] of frames) {
	const path = join(here, file);
	writeFileSync(path, wrap(title, body));
	console.log(`wrote ${path}`);
}
