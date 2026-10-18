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
	if (!lab01.includes('/labs/01-secret-exfiltration/01-why-this-lab/')) {
		errors.push('Lab 01 overview does not link to step 1');
	}
	if (!lab01.includes('>Next<')) errors.push('Lab 01 overview is missing the Next control');
	if (!lab01.includes('>Overview<')) errors.push('Lab 01 overview is missing the step list');
}

const step1Path = join(dist, 'labs/01-secret-exfiltration/01-why-this-lab/index.html');
const setupPath = join(dist, 'labs/01-secret-exfiltration/03-bring-up-arm-a/index.html');
const defendPath = join(dist, 'labs/01-secret-exfiltration/06-defend-with-substrate/index.html');
const lastPath = join(dist, 'labs/01-secret-exfiltration/08-cleanup-and-recap/index.html');
for (const relativePath of [
	'labs/01-secret-exfiltration/01-why-this-lab/index.html',
	'labs/01-secret-exfiltration/08-cleanup-and-recap/index.html',
]) {
	if (!existsSync(join(dist, relativePath))) errors.push(`missing dist/${relativePath}`);
}
if (existsSync(step1Path)) {
	const step1 = readFileSync(step1Path, 'utf8');
	if (!step1.includes('Step 1 of 8')) errors.push('Lab 01 step 1 is missing the progress label');
	if (!step1.includes('>Back<') || !step1.includes('>Next<')) errors.push('Lab 01 step 1 is missing Back or Next');
	if (!step1.includes('<svg')) errors.push('Lab 01 step 1 is missing the lightboard');
	if (!step1.includes('fill="#000000"')) errors.push('Lab 01 lightboard is missing its black board');
}
for (const [relativePath, arm] of [
	['labs/01-secret-exfiltration/05-score-arm-a/index.html', 'bare'],
	['labs/01-secret-exfiltration/07-score-the-difference/index.html', 'substrate'],
]) {
	const path = join(dist, relativePath);
	if (existsSync(path) && !readFileSync(path, 'utf8').includes(`data-scorecard-check="${arm}"`)) {
		errors.push(`dist/${relativePath} is missing the ${arm} scorecard check`);
	}
}
for (const path of [step1Path, setupPath, defendPath, lastPath]) {
	if (!existsSync(path)) continue;
	const html = readFileSync(path, 'utf8');
	if (!html.includes('class="answer"')) errors.push(`${path.slice(dist.length + 1)} is missing the checkpoint answer`);
	if (!html.includes('data-step-done')) errors.push(`${path.slice(dist.length + 1)} is missing the step done control`);
	if (!html.includes('<script')) errors.push(`${path.slice(dist.length + 1)} is missing the tutorial script`);
}
if (existsSync(setupPath) && !readFileSync(setupPath, 'utf8').includes('arm-a-up.sh')) {
	errors.push('Lab 01 setup step is missing arm-a-up.sh');
}
if (existsSync(defendPath)) {
	const defend = readFileSync(defendPath, 'utf8');
	if (!defend.includes('agentgateway')) errors.push('Lab 01 defend step does not name agentgateway');
	if (!defend.includes('name: Required value')) errors.push('Lab 01 defend step is missing the measured agentgateway error');
}
if (existsSync(lastPath) && !readFileSync(lastPath, 'utf8').includes('arm-b-down.sh')) {
	errors.push('Lab 01 cleanup step is missing arm-b-down.sh');
}

if (errors.length > 0) {
	console.error(`Dist check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
	process.exit(1);
}

console.log('Dist check passed.');
