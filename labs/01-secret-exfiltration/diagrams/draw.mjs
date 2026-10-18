/**
 * Shared lightboard drawing. Shapes are filled black rectangles with a
 * thin solid stroke. Words are Caveat glyph fills, so a stroke animation
 * cannot turn a label into a hatch.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../../site/package.json', import.meta.url));
const opentype = require('opentype.js');

export const INK = '#f4f1ea';
export const GREEN = '#39ff14';
export const RED = '#ff3b30';
export const W = 960;
export const H = 540;

const font = opentype.loadSync(
	join(here, '../../../site/node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff'),
);

export function chalk(body, x, y, size, fill, anchor = 'middle') {
	const width = font.getAdvanceWidth(body, size);
	let left = x;
	if (anchor === 'middle') left = x - width / 2;
	if (anchor === 'end') left = x - width;
	const d = font.getPath(body, left, y, size).toPathData(2);
	return `<path d="${d}" fill="${fill}"/>`;
}

export function box(x, y, w, h, stroke) {
	return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#000000" stroke="${stroke}" stroke-width="2"/>`;
}

export function card(x, y, w, h, title, sub, stroke, titleSize) {
	titleSize = titleSize || (sub ? 54 : 64);
	const titleY = sub ? y + h / 2 - 6 : y + h / 2 + 18;
	return [
		box(x, y, w, h, stroke),
		chalk(title, x + w / 2, titleY, titleSize, stroke),
		sub ? chalk(sub, x + w / 2, titleY + 46, 28, stroke) : '',
	].join('');
}

export function arrow(x1, y1, x2, y2, stroke) {
	const angle = Math.atan2(y2 - y1, x2 - x1);
	const size = 14;
	const ax = x2 - size * Math.cos(angle - 0.4);
	const ay = y2 - size * Math.sin(angle - 0.4);
	const bx = x2 - size * Math.cos(angle + 0.4);
	const by = y2 - size * Math.sin(angle + 0.4);
	return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/><path d="M${ax.toFixed(1)} ${ay.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function wrap(title, body) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="run">
<title>${title}</title>
<rect width="${W}" height="${H}" fill="#000000"/>
${body}
</svg>
`;
}
