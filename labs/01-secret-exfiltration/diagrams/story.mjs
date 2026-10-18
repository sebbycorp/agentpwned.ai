#!/usr/bin/env node
/**
 * One Lab 01 diagram, a frame per step.
 *
 * Black board, thin white strokes. Neon green is an allowed hop.
 * Red is a blocked hop. Arm B on these frames is Envoy, the dataplane
 * the lab ships. The allowlisted call is HTTP 200. The sink is blocked.
 *
 *   node labs/01-secret-exfiltration/diagrams/story.mjs
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const INK = '#f4f1ea';
const GREEN = '#39ff14';
const RED = '#ff3b30';

const LEAK_PATH = 'M155 400 L155 470 L820 470 L820 400';
const INJECT_PATH = 'M155 250 L370 250 L820 110';
const BLOCK_PATH = 'M155 310 L300 430';

function text(x, y, body, size, fill, anchor = 'middle') {
	const safe = String(body)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
	return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="${anchor}" font-family="IBM Plex Sans, Segoe UI, sans-serif">${safe}</text>`;
}

function box(x, y, w, h, stroke) {
	return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#000000" stroke="${stroke}" stroke-width="1.75"/>`;
}

function node(x, y, w, h, title, sub, stroke) {
	const titleY = sub ? y + h / 2 - 6 : y + h / 2 + 6;
	return [
		box(x, y, w, h, stroke),
		text(x + w / 2, titleY, title, 20, stroke),
		sub ? text(x + w / 2, titleY + 24, sub, 14, stroke) : '',
	].join('');
}

function scene(mode) {
	const parts = [];
	if (mode === 'tools') {
		parts.push(node(40, 150, 250, 240, 'agent', 'process', INK));
		parts.push(node(360, 80, 220, 80, 'env', 'CANARY_API_KEY', INK));
		parts.push(node(360, 200, 220, 80, 'file', '/secrets/api_key', INK));
		parts.push(node(360, 320, 220, 80, 'socket', 'http_post', INK));
		return parts.join('\n');
	}

	const sandboxed = mode === 'envoy';
	parts.push(
		node(
			40,
			160,
			230,
			170,
			sandboxed ? 'actor' : 'agent',
			sandboxed ? 'no canary' : 'process',
			INK,
		),
	);

	if (mode === 'hold' || mode === 'exfil') {
		parts.push(node(78, 250, 154, 58, 'canary', '', GREEN));
	}
	if (sandboxed) {
		parts.push(node(390, 28, 160, 58, 'canary', 'outside', INK));
		parts.push(node(360, 150, 220, 130, 'envoy', 'v0.5.0', INK));
		parts.push(node(720, 40, 200, 100, 'legit API', 'HTTP 200', GREEN));
		parts.push(node(720, 340, 200, 110, 'sink', 'blocked', RED));
		parts.push(
			`<path d="${INJECT_PATH}" fill="none" stroke="${GREEN}" stroke-width="2.25" stroke-linejoin="round"/>`,
			`<path class="pulse" d="${INJECT_PATH}" fill="none" stroke="${GREEN}" stroke-width="2.25" stroke-linejoin="round"/>`,
			text(520, 236, 'injected', 16, GREEN),
			`<circle class="token green" r="7" fill="${GREEN}"/>`,
			`<path d="${BLOCK_PATH}" fill="none" stroke="${RED}" stroke-width="2.25" stroke-linecap="round"/>`,
			`<path class="pulse" d="${BLOCK_PATH}" fill="none" stroke="${RED}" stroke-width="2.25" stroke-linecap="round"/>`,
			text(250, 400, 'blocked', 16, RED),
		);
	}
	if (mode === 'exfil') {
		parts.push(node(720, 330, 200, 110, 'sink', 'HTTP 200', GREEN));
		parts.push(
			`<path d="${LEAK_PATH}" fill="none" stroke="${GREEN}" stroke-width="2.25" stroke-linejoin="round"/>`,
			`<path class="pulse" d="${LEAK_PATH}" fill="none" stroke="${GREEN}" stroke-width="2.25" stroke-linejoin="round"/>`,
			text(480, 458, 'leaked', 16, GREEN),
			`<circle class="token leak" r="7" fill="${GREEN}"/>`,
		);
	}
	if (mode === 'hold') {
		parts.push(`<g opacity="0.28">${node(720, 330, 200, 110, 'sink', '', INK)}</g>`);
	}
	return parts.join('\n');
}

function svg(title, body) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" class="run">
<title>${title}</title>
<style>
  text { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; }
  .pulse { stroke-dasharray: 18 30; }
  .token { offset-rotate: 0deg; offset-distance: 100%; }
  .token.green { offset-path: path("${INJECT_PATH}"); }
  .token.leak { offset-path: path("${LEAK_PATH}"); }
  @media (prefers-reduced-motion: no-preference) {
    .run .pulse { animation: flow 1.15s linear infinite; }
    .run .token { animation: travel 2.4s linear infinite; }
  }
  @keyframes flow { to { stroke-dashoffset: -96; } }
  @keyframes travel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
</style>
<rect width="960" height="540" fill="#000000"/>
${body}
</svg>
`;
}

function compare() {
	const left = `<g transform="translate(16 48) scale(0.48)">${scene('exfil')}</g>`;
	const right = `<g transform="translate(492 48) scale(0.48)">${scene('envoy')}</g>`;
	return [text(232, 32, 'bare', 18, GREEN), text(720, 32, 'envoy', 18, GREEN), left, right].join('\n');
}

const frames = [
	['story-01-agent.svg', 'Agent', scene('agent')],
	['story-02-tools.svg', 'Tools on the machine', scene('tools')],
	['story-03-hold.svg', 'Canary inside the agent', scene('hold')],
	['story-04-exfil.svg', 'Canary reaches the sink', scene('exfil')],
	['story-05-score-a.svg', 'Arm A score still shows the leak', scene('exfil')],
	['story-06-envoy.svg', 'Envoy injects the key and blocks the sink', scene('envoy')],
	['story-07-compare.svg', 'Bare beside Envoy', compare()],
	['story-08-compare.svg', 'Same boards, then tear the clusters down', compare()],
];

for (const [file, title, body] of frames) {
	const path = join(here, file);
	writeFileSync(path, svg(title, body));
	console.log(`wrote ${path}`);
}
