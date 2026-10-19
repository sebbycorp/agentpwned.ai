#!/usr/bin/env node
/**
 * One Lab 01 diagram, a frame per step.
 *
 * Black board. Outline boxes. Caveat labels are filled glyphs.
 * Neon green is an allowed hop. Red is a leak or a block.
 * Sandboxed agent on these frames is agentgateway.
 *
 *   node labs/01-secret-exfiltration/diagrams/story.mjs
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { INK, GREEN, RED, chalk, box, card, arrow, wrap } from './draw.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function legend() {
	return [
		chalk('green allowed', 250, 518, 24, GREEN),
		chalk('red leak or block', 700, 518, 24, RED),
	].join('');
}

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
		chalk('attacker server', 730, 270, 54, INK),
		chalk('not yet', 730, 318, 28, INK),
	].join('');
}

function predictBare() {
	return [
		chalk('leaks or blocked', 480, 72, 40, INK),
		card(50, 160, 320, 220, 'agent', 'holds canary', INK),
		card(560, 180, 340, 180, 'attacker server', '?', INK),
		arrow(370, 270, 560, 270, INK),
	].join('');
}

function exfil(caption) {
	return [
		caption ? chalk(caption, 480, 64, 40, RED) : '',
		card(40, 150, 300, 240, 'agent', 'holds canary', INK),
		card(560, 170, 360, 200, 'attacker server', 'HTTP 200', RED),
		arrow(340, 270, 560, 270, RED),
		chalk('leaked', 450, 250, 36, RED),
		legend(),
	].join('');
}

function setup() {
	return [
		box(36, 120, 250, 160, INK),
		chalk('canary', 161, 185, 40, INK),
		chalk('outside', 161, 230, 24, INK),
		card(360, 140, 250, 200, 'actor', 'no canary', INK),
		card(670, 140, 250, 200, 'agentgateway', '', INK, 28),
		arrow(610, 240, 670, 240, INK),
	].join('');
}

function gateway() {
	return [
		box(36, 40, 250, 110, INK),
		chalk('canary', 161, 92, 40, INK),
		chalk('outside', 161, 128, 24, INK),
		card(36, 200, 250, 220, 'actor', 'no canary', INK),
		card(310, 175, 280, 220, 'agentgateway', '', INK, 32),
		card(640, 36, 284, 160, 'legit API', 'HTTP 200', GREEN),
		card(640, 340, 284, 150, 'attacker server', 'blocked', RED, 26),
		arrow(286, 290, 310, 280, INK),
		arrow(590, 230, 640, 130, GREEN),
		chalk('injected', 560, 150, 28, GREEN),
		arrow(480, 395, 640, 400, RED),
		chalk('blocked', 540, 360, 28, RED),
		legend(),
	].join('');
}

function injection() {
	const style = `<style>@media (prefers-reduced-motion: reduce) { .hop { display: none; } }</style>`;
	const hops = [
		`<circle class="hop" r="7" fill="${GREEN}"><animateMotion dur="6s" repeatCount="indefinite" path="M140,155 L370,155 L190,268"/></circle>`,
		`<circle class="hop" r="7" fill="${RED}"><animateMotion dur="6s" repeatCount="indefinite" path="M370,175 L760,268"/></circle>`,
	].join('');
	return [
		style,
		chalk('1', 50, 78, 28, INK),
		card(24, 90, 200, 130, 'actor', 'placeholder', INK, 40),
		chalk('2', 300, 78, 28, INK),
		card(240, 90, 250, 130, 'agentgateway', 'intercepts', INK, 28),
		chalk('3', 620, 78, 28, INK),
		card(510, 90, 420, 130, 'allowlist', 'default deny', INK, 44),
		arrow(224, 155, 240, 155, INK),
		arrow(490, 155, 510, 155, INK),
		chalk('4', 70, 252, 28, GREEN),
		card(36, 268, 310, 150, 'legit API', 'HTTP 200', GREEN, 44),
		chalk('replaceHeaders', 400, 252, 26, GREEN),
		arrow(365, 220, 190, 268, GREEN),
		chalk('5', 640, 252, 28, RED),
		card(610, 268, 314, 150, 'other host', 'denied', RED, 44),
		arrow(620, 220, 760, 268, RED),
		hops,
		legend(),
	].join('');
}

function predictSandbox() {
	return [
		chalk('leaks or blocked', 480, 64, 40, INK),
		card(40, 180, 240, 170, 'actor', 'no canary', INK),
		card(310, 180, 270, 170, 'agentgateway', 'allowlist', INK, 28),
		card(660, 100, 260, 140, 'legit', '?', INK),
		card(660, 310, 260, 140, 'attacker server', '?', INK, 32),
		arrow(280, 265, 310, 265, INK),
		arrow(580, 230, 660, 170, INK),
		arrow(580, 300, 660, 360, INK),
	].join('');
}

function challenge() {
	return [
		chalk('four tries', 480, 64, 40, INK),
		card(36, 110, 210, 150, 'read', 'env file', INK),
		card(262, 110, 210, 150, 'attacker server', 'POST', INK, 22),
		card(488, 110, 210, 150, 'dummy', 'unlisted', INK),
		card(714, 110, 210, 150, 'dns', 'lookup', INK),
		card(250, 320, 460, 150, 'attacker server', 'read the report', RED),
	].join('');
}

function compare() {
	const left = [
		chalk('bare', 230, 48, 36, RED),
		box(40, 80, 380, 140, INK),
		chalk('agent', 230, 145, 44, INK),
		chalk('holds canary', 230, 185, 24, INK),
		box(40, 310, 380, 140, RED),
		chalk('attacker server', 230, 375, 44, RED),
		chalk('HTTP 200', 230, 415, 24, RED),
		arrow(230, 220, 230, 310, RED),
		chalk('leaked', 310, 275, 28, RED),
	];
	const right = [
		chalk('agentgateway', 730, 48, 26, INK),
		box(540, 80, 180, 110, INK),
		chalk('actor', 630, 148, 32, INK),
		box(760, 80, 188, 110, GREEN),
		chalk('legit', 854, 132, 28, GREEN),
		chalk('HTTP 200', 854, 162, 18, GREEN),
		box(540, 270, 180, 130, INK),
		chalk('agentgateway', 630, 350, 22, INK),
		box(760, 330, 188, 120, RED),
		chalk('attacker server', 854, 385, 26, RED),
		chalk('blocked', 854, 418, 20, RED),
		arrow(720, 135, 760, 135, GREEN),
		arrow(630, 190, 630, 270, INK),
		arrow(720, 340, 760, 380, RED),
	];
	return [...left, ...right, legend()].join('');
}

const frames = [
	['story-01-agent.svg', 'Agent', agent()],
	['story-02-tools.svg', 'Tools on the machine', tools()],
	['story-03-hold.svg', 'Canary inside the agent', hold()],
	['story-predict-bare.svg', 'Will the canary reach the attacker server?', predictBare()],
	['story-04-exfil.svg', 'Canary reaches the attacker server', exfil('')],
	['story-05-score-a.svg', 'Bare agent score still shows the leak', exfil('1 hit')],
	['story-06-setup.svg', 'Canary stays outside the actor', setup()],
	['story-06-gateway.svg', 'agentgateway injects the key and blocks the attacker server', gateway()],
	['story-09-injection.svg', 'Placeholder, allowlist, replaceHeaders, or denied', injection()],
	['story-predict-sandbox.svg', 'Will the canary reach the attacker server?', predictSandbox()],
	['story-10-challenge.svg', 'Four tries, then read the attacker server report', challenge()],
	['story-07-compare.svg', 'Bare beside agentgateway', compare()],
	['story-08-compare.svg', 'Bare beside agentgateway, then both clusters go away', compare()],
];

for (const [file, title, body] of frames) {
	const path = join(here, file);
	writeFileSync(path, wrap(title, body));
	console.log(`wrote ${path}`);
}
