#!/usr/bin/env node
/**
 * Crisp lightboard frames for Lab 01.
 *
 * Solid black board. Thin white strokes. Neon green is an allowed hop.
 * Red is a leak or a block. Labels are Caveat glyph fills, not a rough.js hatch.
 *
 *   node labs/01-secret-exfiltration/diagrams/generate.mjs
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { INK, GREEN, RED, chalk, card, arrow, wrap } from './draw.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const frames = {
	'01-agent.svg': wrap(
		'The agent',
		card(80, 140, 340, 240, 'agent', 'calls tools', INK) + chalk('a process with a socket', 680, 280, 36, INK),
	),
	'02-secret.svg': wrap(
		'The canary is inside the agent',
		card(70, 140, 360, 260, 'agent', 'canary inside', GREEN) + chalk('the key is in the process', 700, 280, 32, INK),
	),
	'03-injection.svg': wrap(
		'Envoy injects the key. The sink stays blocked.',
		[
			card(36, 180, 240, 180, 'actor', 'no canary', INK),
			card(320, 40, 220, 120, 'canary', 'outside', INK),
			card(310, 200, 240, 160, 'envoy', 'v0.5.0', INK),
			card(620, 150, 300, 140, 'legit API', 'HTTP 200', GREEN),
			card(620, 360, 300, 140, 'sink', 'blocked', RED),
			arrow(276, 250, 310, 250, GREEN),
			arrow(550, 250, 620, 210, GREEN),
			arrow(470, 360, 620, 410, RED),
			chalk('injected', 500, 180, 28, GREEN),
			chalk('blocked', 500, 400, 28, RED),
		].join(''),
	),
	'04-exfil.svg': wrap(
		'Bare beside sandboxed',
		[
			chalk('bare', 230, 70, 36, RED),
			card(50, 110, 360, 150, 'agent', 'holds canary', INK),
			card(50, 340, 360, 150, 'sink', 'HTTP 200', RED),
			arrow(230, 260, 230, 340, RED),
			chalk('sandboxed', 720, 70, 36, INK),
			card(540, 110, 380, 150, 'actor', 'no canary', INK),
			card(540, 340, 380, 150, 'envoy', 'sink blocked', RED),
			arrow(730, 260, 730, 340, RED),
		].join(''),
	),
};

for (const [file, svg] of Object.entries(frames)) {
	const path = join(here, file);
	writeFileSync(path, svg);
	console.log(`wrote ${path}`);
}
