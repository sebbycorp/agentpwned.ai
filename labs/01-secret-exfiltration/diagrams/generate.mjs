#!/usr/bin/env node
/**
 * Lightboard frames for Lab 01.
 *
 * Black board, white chalk, neon green for an allowed hop, red for a blocked hop.
 * Rough strokes come from roughjs. Lettering is Caveat, converted to paths so the
 * SVG does not depend on a webfont at view time.
 *
 * Regenerate from the repo root (after `npm ci` in site/):
 *
 *   node labs/01-secret-exfiltration/diagrams/generate.mjs
 *
 * Frames grow in order: agent, plus the key, plus injection, plus the exfil arrow.
 * Each shape uses a fixed roughjs seed so a rerun stays stable.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../../site/package.json', import.meta.url));
const rough = require('roughjs');
const opentype = require('opentype.js');

const fontPath = join(
	here,
	'../../../site/node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff',
);
const font = opentype.loadSync(fontPath);
const generator = rough.generator();

const INK = '#f4f1ea';
const GREEN = '#39ff14';
const RED = '#ff3b30';
const WIDTH = 960;
const HEIGHT = 540;

function opsToD(ops) {
	let d = '';
	for (const step of ops) {
		const n = step.data.map((value) => Number(value).toFixed(1));
		if (step.op === 'move') d += `M${n[0]} ${n[1]}`;
		else if (step.op === 'lineTo') d += `L${n[0]} ${n[1]}`;
		else if (step.op === 'bcurveTo') d += `C${n[0]} ${n[1]} ${n[2]} ${n[3]} ${n[4]} ${n[5]}`;
		else if (step.op === 'qcurveTo') d += `Q${n[0]} ${n[1]} ${n[2]} ${n[3]}`;
		else throw new Error(`unknown rough op ${step.op}`);
	}
	return d;
}

function stroke(drawable, color, width, delay) {
	// Outline sets only. A roughjs fill (any truthy `fill`, even the string 'none')
	// adds a hachure set that would hatch over the box and its lettering.
	return drawable.sets
		.filter((set) => set.type === 'path')
		.map((set) => {
			const d = opsToD(set.ops);
			return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" style="--d:${delay}s"/>`;
		})
		.join('\n');
}

function chalk(text, x, y, size, color) {
	const path = font.getPath(text, x, y, size);
	const svg = path.toSVG(1);
	return svg.replace('<path ', `<path fill="${color}" `);
}

function centered(text, cx, baseline, size, color) {
	const width = font.getAdvanceWidth(text, size);
	return chalk(text, cx - width / 2, baseline, size, color);
}

function box(x, y, w, h, seed, color) {
	const drawable = generator.rectangle(x, y, w, h, {
		roughness: 1.65,
		bowing: 1.15,
		stroke: color,
		strokeWidth: 2.4,
		seed,
	});
	return stroke(drawable, color, 2.4, (seed % 20) * 0.06);
}

function line(x1, y1, x2, y2, seed, color, width = 2.4) {
	const drawable = generator.line(x1, y1, x2, y2, {
		roughness: 1.5,
		bowing: 0.8,
		stroke: color,
		strokeWidth: width,
		seed,
	});
	return stroke(drawable, color, width, (seed % 20) * 0.06);
}

function arrow(x1, y1, x2, y2, seed, color) {
	const angle = Math.atan2(y2 - y1, x2 - x1);
	const length = 18;
	const spread = 0.55;
	const parts = [line(x1, y1, x2, y2, seed, color, 2.6)];
	parts.push(
		line(
			x2,
			y2,
			x2 - length * Math.cos(angle - spread),
			y2 - length * Math.sin(angle - spread),
			seed + 1,
			color,
			2.6,
		),
	);
	parts.push(
		line(
			x2,
			y2,
			x2 - length * Math.cos(angle + spread),
			y2 - length * Math.sin(angle + spread),
			seed + 2,
			color,
			2.6,
		),
	);
	return parts.join('\n');
}

function cross(cx, cy, seed, color) {
	const r = 16;
	return [line(cx - r, cy - r, cx + r, cy + r, seed, color, 2.8), line(cx - r, cy + r, cx + r, cy - r, seed + 1, color, 2.8)].join(
		'\n',
	);
}

function frame(number, body, title, description) {
	const border = box(18, 18, WIDTH - 36, HEIGHT - 36, 2, INK);
	const heading = chalk('secret exfiltration', 46, 62, 28, INK);
	const mark = chalk(`frame ${number}`, 760, 62, 26, INK);
	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img">
<title>${title}</title>
<desc>${description}</desc>
<rect width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>
${border}
${heading}
${mark}
${body}
</svg>
`;
	return svg;
}

function agentBox(label, caption) {
	return [
		box(70, 150, 280, 210, 11, INK),
		centered(label, 210, 250, 58, INK),
		centered(caption, 210, 310, 26, INK),
	].join('\n');
}

const frames = [
	{
		file: '01-agent.svg',
		number: '1',
		title: 'Frame 1. The agent.',
		description: 'A hand-drawn box labeled agent on a black board.',
		body() {
			return [
				agentBox('agent', 'calls tools'),
				centered('a process with a socket', 620, 270, 32, INK),
			].join('\n');
		},
	},
	{
		file: '02-secret.svg',
		number: '2',
		title: 'Frame 2. The key is inside the agent.',
		description: 'The agent box now contains a smaller box labeled key.',
		body() {
			return [
				box(70, 150, 280, 210, 11, INK),
				centered('agent', 210, 210, 48, INK),
				box(112, 236, 196, 86, 21, INK),
				centered('key', 210, 292, 40, INK),
				centered('the key lives in the process', 640, 270, 30, INK),
			].join('\n');
		},
	},
	{
		file: '03-injection.svg',
		number: '3',
		title: 'Frame 3. The gateway injects the key.',
		description:
			'The actor box has no key. A canary box sits outside it. A green arrow runs from egress to the legit API.',
		body() {
			return [
				agentBox('actor', 'no key inside'),
				box(400, 78, 180, 72, 31, INK),
				centered('canary', 490, 126, 32, INK),
				line(490, 150, 500, 188, 33, INK, 2.2),
				box(390, 188, 220, 140, 41, INK),
				centered('egress', 500, 270, 40, INK),
				box(700, 178, 210, 150, 61, GREEN),
				centered('legit API', 805, 252, 32, GREEN),
				centered('allowlisted', 805, 292, 24, GREEN),
				arrow(610, 258, 698, 252, 71, GREEN),
				centered('injected', 654, 236, 26, GREEN),
			].join('\n');
		},
	},
	{
		file: '04-exfil.svg',
		number: '4',
		title: 'Frame 4. The exfil hop is blocked.',
		description:
			'Frame 3 plus a red arrow from the actor toward a sink, crossed out and labeled blocked.',
		body() {
			return [
				agentBox('actor', 'no key inside'),
				box(400, 70, 170, 64, 31, INK),
				centered('canary', 485, 112, 28, INK),
				line(485, 134, 500, 176, 33, INK, 2.2),
				box(390, 176, 210, 120, 41, INK),
				centered('egress', 495, 248, 36, INK),
				box(690, 150, 220, 120, 61, GREEN),
				centered('legit API', 800, 210, 30, GREEN),
				centered('allowlisted', 800, 244, 22, GREEN),
				arrow(600, 230, 688, 210, 71, GREEN),
				centered('injected', 640, 196, 22, GREEN),
				box(690, 360, 220, 110, 81, RED),
				centered('sink', 800, 425, 36, RED),
				arrow(250, 360, 688, 410, 91, RED),
				cross(470, 392, 101, RED),
				centered('blocked', 470, 368, 26, RED),
			].join('\n');
		},
	},
];

for (const item of frames) {
	const svg = frame(item.number, item.body(), item.title, item.description);
	const path = join(here, item.file);
	writeFileSync(path, svg);
	console.log(`wrote ${path}`);
}
