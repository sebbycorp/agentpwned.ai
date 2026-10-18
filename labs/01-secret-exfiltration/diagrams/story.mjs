#!/usr/bin/env node
/**
 * One Lab 01 diagram, a frame per step.
 *
 * Black board. Outline boxes. Caveat labels are filled glyphs.
 * Neon green is an allowed hop. Red is a blocked hop.
 * Arm B on these frames is Envoy.
 *
 *   node labs/01-secret-exfiltration/diagrams/story.mjs
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { INK, GREEN, RED, chalk, box, card, arrow, wrap } from './draw.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function agent() {
	return card(170, 120, 620, 300, 'agent', 'a process with a socket', INK);
}

function tools() {
	return [
		card(36, 150, 300, 250, 'agent', 'process', INK),
		card(420, 36, 500, 140, 'env', 'CANARY_API_KEY', INK),
		card(420, 200, 500, 140, 'file', '/secrets/api_key', INK),
		card(420, 364, 500, 140, 'socket', 'http_post', INK),
		arrow(336, 230, 420, 106, INK),
		arrow(336, 275, 420, 270, INK),
		arrow(336, 330, 420, 420, INK),
	].join('');
}

function hold() {
	return [
		box(70, 80, 380, 380, INK),
		chalk('agent', 260, 160, 64, INK),
		box(120, 230, 280, 160, GREEN),
		chalk('canary', 260, 325, 58, GREEN),
		box(560, 180, 340, 180, INK),
		chalk('sink', 730, 270, 54, INK),
		chalk('not yet', 730, 318, 28, INK),
	].join('');
}

function exfil(caption) {
	return [
		caption ? chalk(caption, 480, 64, 40, GREEN) : '',
		card(40, 150, 300, 240, 'agent', 'holds canary', INK),
		card(560, 170, 360, 200, 'sink', 'HTTP 200', GREEN),
		arrow(340, 270, 560, 270, GREEN),
		chalk('leaked', 450, 250, 36, GREEN),
	].join('');
}

function envoy() {
	return [
		box(36, 40, 250, 110, INK),
		chalk('canary', 161, 92, 40, INK),
		chalk('outside', 161, 128, 24, INK),
		card(36, 200, 280, 220, 'actor', 'no canary', INK),
		card(360, 180, 230, 200, 'envoy', 'v0.5.0', INK),
		card(640, 36, 284, 160, 'legit API', 'HTTP 200', GREEN),
		card(640, 340, 284, 160, 'sink', 'blocked', RED),
		arrow(316, 280, 360, 260, GREEN),
		arrow(590, 220, 640, 130, GREEN),
		chalk('injected', 500, 150, 32, GREEN),
		arrow(500, 380, 640, 400, RED),
		chalk('blocked', 520, 360, 32, RED),
	].join('');
}

function compare() {
	const left = [
		chalk('bare', 230, 48, 36, GREEN),
		box(40, 80, 380, 150, INK),
		chalk('agent', 230, 150, 48, INK),
		chalk('holds canary', 230, 190, 24, INK),
		box(40, 340, 380, 150, GREEN),
		chalk('sink', 230, 410, 48, GREEN),
		chalk('HTTP 200', 230, 452, 24, GREEN),
		arrow(230, 230, 230, 340, GREEN),
		chalk('leaked', 300, 290, 28, GREEN),
	];
	const right = [
		chalk('envoy', 720, 48, 36, INK),
		box(540, 80, 180, 120, INK),
		chalk('actor', 630, 155, 36, INK),
		box(760, 80, 160, 120, GREEN),
		chalk('legit', 840, 140, 32, GREEN),
		chalk('HTTP 200', 840, 172, 20, GREEN),
		box(540, 280, 180, 140, INK),
		chalk('envoy', 630, 365, 36, INK),
		box(760, 360, 160, 130, RED),
		chalk('sink', 840, 420, 32, RED),
		chalk('blocked', 840, 452, 20, RED),
		arrow(720, 140, 760, 140, GREEN),
		arrow(630, 200, 630, 280, INK),
		arrow(720, 360, 760, 400, RED),
	];
	return [...left, ...right].join('');
}

const frames = [
	['story-01-agent.svg', 'Agent', agent()],
	['story-02-tools.svg', 'Tools on the machine', tools()],
	['story-03-hold.svg', 'Canary inside the agent', hold()],
	['story-04-exfil.svg', 'Canary reaches the sink', exfil('')],
	['story-05-score-a.svg', 'Arm A score still shows the leak', exfil('1 hit')],
	['story-06-envoy.svg', 'Envoy injects the key and blocks the sink', envoy()],
	['story-07-compare.svg', 'Bare beside Envoy', compare()],
	['story-08-compare.svg', 'Same boards, then tear the clusters down', compare() + chalk('then both clusters go away', 480, 520, 28, INK)],
];

for (const [file, title, body] of frames) {
	const path = join(here, file);
	writeFileSync(path, wrap(title, body));
	console.log(`wrote ${path}`);
}
