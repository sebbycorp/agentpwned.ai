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
	if (!html.includes('pwn an agent. see exactly how. then lock it down.')) {
		errors.push('dist/index.html is missing the mission line');
	}
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
const defendPath = join(dist, 'labs/01-secret-exfiltration/08-defend-with-substrate/index.html');
const lastPath = join(dist, 'labs/01-secret-exfiltration/14-cleanup-and-recap/index.html');
const predictPath = join(dist, 'labs/01-secret-exfiltration/04-predict-bare/index.html');
const revealPath = join(dist, 'labs/01-secret-exfiltration/07-score-arm-a/index.html');
const injectionPath = join(dist, 'labs/01-secret-exfiltration/09-how-injection-works/index.html');
const attackPath = join(dist, 'labs/01-secret-exfiltration/05-attack-the-bare-agent/index.html');
const challengePath = join(dist, 'labs/01-secret-exfiltration/11-attack-arm-b/index.html');
const replayPath = join(dist, 'labs/01-secret-exfiltration/06-what-just-happened/index.html');
const stoppedPath = join(dist, 'labs/01-secret-exfiltration/12-where-it-stopped/index.html');
for (const relativePath of [
	'labs/01-secret-exfiltration/01-why-this-lab/index.html',
	'labs/01-secret-exfiltration/14-cleanup-and-recap/index.html',
	'labs/01-secret-exfiltration/04-predict-bare/index.html',
	'labs/01-secret-exfiltration/06-what-just-happened/index.html',
	'labs/01-secret-exfiltration/09-how-injection-works/index.html',
	'labs/01-secret-exfiltration/11-attack-arm-b/index.html',
	'labs/01-secret-exfiltration/12-where-it-stopped/index.html',
]) {
	if (!existsSync(join(dist, relativePath))) errors.push(`missing dist/${relativePath}`);
}
if (existsSync(step1Path)) {
	const step1 = readFileSync(step1Path, 'utf8');
	if (!step1.includes('Step 1 of 14')) errors.push('Lab 01 step 1 is missing the progress label');
	if (!step1.includes('>Back<') || !step1.includes('>Next<')) errors.push('Lab 01 step 1 is missing Back or Next');
	if (!step1.includes('<svg')) errors.push('Lab 01 step 1 is missing the lightboard');
	if (!step1.includes('fill="#000000"')) errors.push('Lab 01 lightboard is missing its black board');
}
if (existsSync(predictPath)) {
	const predict = readFileSync(predictPath, 'utf8');
	if (!predict.includes('data-predict="bare"')) errors.push('Lab 01 bare predict step is missing the choice');
	if (!predict.includes('is-locked')) errors.push('Lab 01 bare predict step does not lock Next');
}
if (existsSync(revealPath)) {
	const reveal = readFileSync(revealPath, 'utf8');
	if (!reveal.includes('data-reveal="bare"') || !reveal.includes('data-answer="leaks"')) {
		errors.push('Lab 01 Arm A score is missing the predict reveal');
	}
}
if (existsSync(injectionPath) && !readFileSync(injectionPath, 'utf8').includes('replaceHeaders')) {
	errors.push('Lab 01 injection step is missing replaceHeaders');
}
if (existsSync(attackPath)) {
	const attack = readFileSync(attackPath, 'utf8');
	if (!attack.includes('fill="#ff3b30"')) errors.push('Lab 01 leak board is missing the red leak');
}
if (existsSync(challengePath) && !readFileSync(challengePath, 'utf8').includes('challenge.sh')) {
	errors.push('Lab 01 challenge step is missing challenge.sh');
}
if (existsSync(replayPath)) {
	const replay = readFileSync(replayPath, 'utf8');
	if (!replay.includes('class="replay')) errors.push('Lab 01 leak replay is missing the timeline');
	if (!replay.includes('{"stored": true, "count": 1}')) errors.push('Lab 01 leak replay is missing the sink response');
}
if (existsSync(stoppedPath)) {
	const stopped = readFileSync(stoppedPath, 'utf8');
	if (!stopped.includes('egress_denies')) errors.push('Lab 01 stop replay is missing egress_denies');
	if (!stopped.includes('Errno -2')) errors.push('Lab 01 stop replay is missing the client error');
}
const labsIndex = join(dist, 'labs/index.html');
if (existsSync(labsIndex) && !readFileSync(labsIndex, 'utf8').includes('Pwn an agent. See exactly how. Then lock it down.')) {
	errors.push('labs index is missing the mission line');
}
const handCluster = join(dist, 'labs/01-secret-exfiltration/02-arm-a-cluster/index.html');
const handInstall = join(dist, 'labs/01-secret-exfiltration/07-substrate-install/index.html');
const handActor = join(dist, 'labs/01-secret-exfiltration/09-arm-b-actor/index.html');
if (existsSync(handCluster) && !readFileSync(handCluster, 'utf8').includes('kind-arm-a.yaml')) {
	errors.push('Lab 01 hand track is missing the Arm A kind command');
}
const handPrereq = join(dist, 'labs/01-secret-exfiltration/01-prerequisites/index.html');
if (existsSync(handPrereq) && !readFileSync(handPrereq, 'utf8').includes('What this does')) {
	errors.push('Lab 01 hand track is missing the step explanation');
}
if (existsSync(handActor) && !readFileSync(handActor, 'utf8').includes('class="why"')) {
	errors.push('Lab 01 hand track is missing the Why block');
}
if (existsSync(handInstall)) {
	const install = readFileSync(handInstall, 'utf8');
	if (!install.includes('hack/install-ate-kind.sh')) {
		errors.push('Lab 01 hand track is missing hack/install-ate-kind.sh');
	}
	if (!install.includes('--atenet-dataplane=agentgateway')) {
		errors.push('Lab 01 hand track is missing --atenet-dataplane=agentgateway');
	}
	if (!install.includes('sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f')) {
		errors.push('Lab 01 hand track is missing the agentgateway image digest');
	}
}
if (existsSync(handActor) && !readFileSync(handActor, 'utf8').includes('replaceHeaders')) {
	errors.push('Lab 01 hand track is missing replaceHeaders');
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
