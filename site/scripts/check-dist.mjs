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
	const rawIndex = readFileSync(indexPath, 'utf8');
	const withoutDenial = rawIndex.replaceAll('does not use a SandboxAgent CRD', '');
	if (/sandboxagent/i.test(withoutDenial)) {
		errors.push('landing page claims SandboxAgent beyond the lab denial');
	}
}

const lab01Path = join(dist, 'labs/01-secret-exfiltration/index.html');
if (existsSync(lab01Path)) {
	const lab01 = readFileSync(lab01Path, 'utf8');
	if (!lab01.includes('>Draft<')) errors.push('Lab 01 page does not show Draft from lab.md');
	if (lab01.includes('Coming soon')) errors.push('Lab 01 page is still marked coming soon');
	if (!lab01.includes('arm-a-up.sh')) errors.push('Lab 01 page is not rendering labs/01-secret-exfiltration/README.md');
	if (!lab01.includes('id="attack"')) errors.push('Lab 01 page is missing the Attack section');
}

if (errors.length > 0) {
	console.error(`Dist check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
	process.exit(1);
}

console.log('Dist check passed.');
