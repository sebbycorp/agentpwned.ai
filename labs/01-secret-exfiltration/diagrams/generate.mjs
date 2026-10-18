#!/usr/bin/env node
/**
 * Crisp lightboard frames for Lab 01.
 *
 * Solid black board. Thin white strokes. Neon green means the hop was allowed.
 * Red means it was blocked. Labels are plain text, not a rough.js fill.
 * The old rough.js hachure covered the board and made the words unreadable.
 *
 *   node labs/01-secret-exfiltration/diagrams/generate.mjs
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const INK = '#f4f1ea';
const GREEN = '#39ff14';
const RED = '#ff3b30';
const W = 960;
const H = 540;

function text(x, y, body, size, fill) {
	const safe = String(body)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
	return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif">${safe}</text>`;
}

function box(x, y, w, h, stroke) {
	return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#000000" stroke="${stroke}" stroke-width="1.75"/>`;
}

function label(x, y, w, h, title, sub, stroke) {
	const ty = sub ? y + h / 2 - 4 : y + h / 2 + 8;
	return [box(x, y, w, h, stroke), text(x + w / 2, ty, title, 28, stroke), sub ? text(x + w / 2, ty + 28, sub, 16, stroke) : ''].join('');
}

function arrow(x1, y1, x2, y2, stroke) {
	const angle = Math.atan2(y2 - y1, x2 - x1);
	const size = 12;
	const ax = x2 - size * Math.cos(angle - 0.45);
	const ay = y2 - size * Math.sin(angle - 0.45);
	const bx = x2 - size * Math.cos(angle + 0.45);
	const by = y2 - size * Math.sin(angle + 0.45);
	return `<path d="M${x1} ${y1} L${x2} ${y2} M${ax} ${ay} L${x2} ${y2} L${bx} ${by}" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function frame(title, body) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<title>${title}</title>
<rect width="${W}" height="${H}" fill="#000000"/>
<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="16" fill="#000000" stroke="${INK}" stroke-width="1.25"/>
${text(150, 58, 'secret exfiltration', 18, INK)}
${body}
</svg>
`;
}

const frames = {
	'01-agent.svg': frame(
		'The agent',
		label(70, 160, 280, 180, 'agent', 'calls tools', INK) + text(640, 260, 'a process with a socket', 22, INK),
	),
	'02-secret.svg': frame(
		'The canary is inside the agent',
		[
			label(70, 150, 300, 220, 'agent', '', INK),
			label(112, 250, 216, 80, 'canary', '', GREEN),
			text(680, 260, 'the key is in the process', 22, INK),
		].join(''),
	),
	'03-injection.svg': frame(
		'Envoy injects the key. The sink stays blocked.',
		[
			label(48, 180, 220, 150, 'actor', 'no canary', INK),
			label(300, 48, 180, 70, 'canary', 'outside', INK),
			label(300, 160, 230, 130, 'envoy', 'v0.5.0', INK),
			label(620, 150, 200, 110, 'legit API', 'HTTP 200', GREEN),
			label(620, 340, 200, 100, 'sink', 'blocked', RED),
			arrow(268, 250, 300, 220, RED),
			text(250, 210, 'blocked', 16, RED),
		].join(''),
	),
	'04-exfil.svg': frame(
		'Bare beside sandboxed',
		[
			text(250, 100, 'bare', 18, GREEN),
			label(70, 140, 200, 120, 'agent', 'holds canary', INK),
			label(70, 320, 200, 90, 'sink', 'HTTP 200', GREEN),
			arrow(170, 260, 170, 320, GREEN),
			text(700, 100, 'sandboxed', 18, RED),
			label(560, 140, 220, 110, 'actor', 'no canary', INK),
			label(560, 300, 250, 100, 'envoy', 'sink blocked', RED),
			arrow(670, 250, 670, 300, RED),
		].join(''),
	),
};

for (const [file, svg] of Object.entries(frames)) {
	const path = join(here, file);
	writeFileSync(path, svg);
	console.log(`wrote ${path}`);
}
