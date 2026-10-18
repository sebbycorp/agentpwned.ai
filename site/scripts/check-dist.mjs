import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(siteRoot, 'dist');

const required = [
	'index.html',
	'CNAME',
	'404.html',
	'labs/index.html',
	'labs/template/index.html',
	'labs/01-secret-exfiltration/index.html',
	'labs/02-egress-allowlist/index.html',
	'labs/03-blast-radius/index.html',
];

const errors = [];

for (const relativePath of required) {
	if (!existsSync(join(dist, relativePath))) errors.push(`missing dist/${relativePath}`);
}

if (existsSync(join(dist, 'CNAME'))) {
	const cname = readFileSync(join(dist, 'CNAME'), 'utf8');
	if (cname !== 'agentpwned.ai\n') errors.push('dist/CNAME must be exactly agentpwned.ai followed by a newline');
}

const indexPath = join(dist, 'index.html');
if (existsSync(indexPath)) {
	const html = readFileSync(indexPath, 'utf8').toLowerCase();
	for (const snippet of ['googletagmanager', 'google-analytics', 'plausible.io', 'segment.com', 'cdn.mxpnl.com']) {
		if (html.includes(snippet)) errors.push(`tracking snippet in dist/index.html: ${snippet}`);
	}
	if (!html.includes('agents get pwned')) errors.push('dist/index.html is missing the hero tagline');
}

if (errors.length > 0) {
	console.error(`Dist check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
	process.exit(1);
}

console.log('Dist check passed.');
