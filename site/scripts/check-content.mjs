import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(siteRoot, '..');

const REQUIRED = ['Objectives', 'Prerequisites', 'Setup', 'Attack', 'Defend', 'Measure', 'Cleanup'];

const named = (name) => `&${name};`;
const numeric = (code) => `&#${code};`;
const DASHES = [
	['\u2014', 'em dash'],
	['\u2013', 'en dash'],
	[named('mdash'), 'em dash entity'],
	[named('ndash'), 'en dash entity'],
	[numeric(8212), 'em dash numeric entity'],
	[numeric(8211), 'en dash numeric entity'],
];

const TEXT_EXT = new Set(['.md', '.astro', '.css', '.mjs', '.js', '.ts', '.yml', '.yaml', '.json', '.svg', '.html']);

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name === 'dist' || name === '.astro') continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else out.push(path);
	}
	return out;
}

function extension(path) {
	const index = path.lastIndexOf('.');
	return index === -1 ? '' : path.slice(index);
}

function field(frontmatter, key) {
	const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
	return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

const errors = [];

const scanRoots = [
	join(repoRoot, 'README.md'),
	join(repoRoot, 'DEPLOY.md'),
	join(repoRoot, '.github'),
	join(siteRoot, 'src'),
	join(siteRoot, 'public'),
	join(siteRoot, 'astro.config.mjs'),
	join(siteRoot, 'package.json'),
	join(siteRoot, 'scripts'),
	join(siteRoot, 'README.md'),
];

for (const root of scanRoots) {
	const files = statSync(root).isDirectory() ? walk(root) : [root];
	for (const file of files) {
		if (!TEXT_EXT.has(extension(file)) && !file.endsWith('CNAME')) continue;
		const lines = readFileSync(file, 'utf8').split(/\r?\n/);
		lines.forEach((line, index) => {
			for (const [token, label] of DASHES) {
				if (line.includes(token)) {
					errors.push(`${relative(repoRoot, file)}:${index + 1}: ${label} in site copy`);
				}
			}
		});
	}
}

const repoLabs = join(repoRoot, 'labs');
const publishedIds = new Set();
if (statSync(repoLabs, { throwIfNoEntry: false })?.isDirectory()) {
	for (const name of readdirSync(repoLabs)) {
		if (!/^\d\d-/.test(name)) continue;
		const folder = join(repoLabs, name);
		if (!statSync(folder).isDirectory()) continue;
		const labFile = join(folder, 'lab.md');
		const readmeFile = join(folder, 'README.md');
		if (!statSync(labFile, { throwIfNoEntry: false })?.isFile() || !statSync(readmeFile, { throwIfNoEntry: false })?.isFile()) {
			errors.push(`${name} needs both lab.md and README.md`);
			continue;
		}
		const meta = readFileSync(labFile, 'utf8');
		const fence = meta.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		if (!fence) {
			errors.push(`${name}/lab.md is missing frontmatter`);
			continue;
		}
		const status = field(fence[1], 'status');
		const title = field(fence[1], 'title');
		const slug = field(fence[1], 'slug') || name;
		if (!title || !status) errors.push(`${name}/lab.md needs title and status`);
		if (slug !== name) errors.push(`${name}/lab.md slug must match the folder name`);
		publishedIds.add(name);
		const readme = readFileSync(readmeFile, 'utf8');
		const stepsDir = join(folder, 'steps');
		const stepFiles = statSync(stepsDir, { throwIfNoEntry: false })?.isDirectory()
			? readdirSync(stepsDir)
					.filter((file) => /^\d\d-.+\.md$/.test(file))
					.sort()
			: [];
		if (stepFiles.length > 0) {
			if (!readme.includes(`(steps/${stepFiles[0]})`)) {
				errors.push(`${name}/README.md must link to steps/${stepFiles[0]}`);
			}
			stepFiles.forEach((file, index) => {
				const expected = String(index + 1).padStart(2, '0');
				if (!file.startsWith(`${expected}-`)) {
					errors.push(`${name}/steps/${file} breaks the 01, 02, ... sequence`);
				}
				const text = readFileSync(join(stepsDir, file), 'utf8');
				const fence = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
				if (!fence) {
					errors.push(`${name}/steps/${file} is missing frontmatter`);
					return;
				}
				if (!field(fence[1], 'title') || !field(fence[1], 'summary')) {
					errors.push(`${name}/steps/${file} needs title and summary`);
				}
				if (index === 0 && !text.includes('(../README.md)')) {
					errors.push(`${name}/steps/${file} must link back to ../README.md`);
				}
				if (index > 0 && !text.includes(`(${stepFiles[index - 1]})`)) {
					errors.push(`${name}/steps/${file} must link back to ${stepFiles[index - 1]}`);
				}
				if (index < stepFiles.length - 1 && !text.includes(`(${stepFiles[index + 1]})`)) {
					errors.push(`${name}/steps/${file} must link onward to ${stepFiles[index + 1]}`);
				}
				for (const section of [
					'What we are about to do',
					'Why it matters',
					'Command',
					'On the board',
					'What you should see',
					'Checkpoint',
				]) {
					if (!text.includes(`## ${section}`)) {
						errors.push(`${name}/steps/${file} is missing ## ${section}`);
					}
				}
			});
		} else {
			let cursor = 0;
			for (const line of readme.split(/\r?\n/)) {
				const heading = line.match(/^##\s+(.+?)\s*$/);
				if (heading && heading[1] === REQUIRED[cursor]) cursor += 1;
			}
			if (cursor !== REQUIRED.length) {
				errors.push(`${name}/README.md must include these level-2 headings in order: ${REQUIRED.join(', ')}`);
			}
		}
		const placeholder = join(siteRoot, 'src/content/labs', `${name}.md`);
		if (statSync(placeholder, { throwIfNoEntry: false })?.isFile()) {
			errors.push(`Remove site/src/content/labs/${name}.md. labs/${name} is the source for that page.`);
		}
	}
}

const labsDir = join(siteRoot, 'src/content/labs');
const labFiles = readdirSync(labsDir).filter(
	(name) => (/^\d\d-.+\.md$/.test(name) || name === 'template.md') && !publishedIds.has(name.replace(/\.md$/, '')),
);

if (!labFiles.includes('template.md')) {
	errors.push('site/src/content/labs/template.md is missing');
}

for (const name of labFiles) {
	const text = readFileSync(join(labsDir, name), 'utf8');
	const fence = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
	if (!fence) {
		errors.push(`${name}: missing frontmatter`);
		continue;
	}
	const frontmatter = fence[0];
	const kind = field(frontmatter, 'kind');
	const status = field(frontmatter, 'status');
	const isTemplate = name === 'template.md';
	if (isTemplate && (kind !== 'template' || status !== 'template')) {
		errors.push(`${name}: set kind and status to template`);
	}
	if (!isTemplate && kind !== 'lab') {
		errors.push(`${name}: numbered labs use kind: lab`);
	}
	if (!isTemplate && status === 'template') {
		errors.push(`${name}: labs do not use status: template`);
	}

	const headings = [];
	for (const line of text.slice(fence[0].length).split(/\r?\n/)) {
		const heading = line.match(/^##\s+(.+?)\s*$/);
		if (heading) headings.push(heading[1]);
	}
	if (headings.join('\n') !== REQUIRED.join('\n')) {
		errors.push(
			`${name}: level-2 headings must be exactly ${REQUIRED.join(', ')}. Found: ${headings.join(', ') || '(none)'}`,
		);
	}
}

const cname = readFileSync(join(siteRoot, 'public/CNAME'), 'utf8');
if (cname.trim() !== 'agentpwned.ai' || cname !== 'agentpwned.ai\n') {
	errors.push('site/public/CNAME must be exactly agentpwned.ai followed by a newline');
}

const config = readFileSync(join(siteRoot, 'astro.config.mjs'), 'utf8');
if (!config.includes("base: '/'")) {
	errors.push("astro.config.mjs must set base: '/' so agentpwned.ai is served from the domain root");
}
if (!config.includes("site: 'https://agentpwned.ai'")) {
	errors.push("astro.config.mjs must set site: 'https://agentpwned.ai'");
}

if (errors.length > 0) {
	console.error(`Content check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
	process.exit(1);
}

console.log(`Content check passed (${labFiles.length} site lab files, ${publishedIds.size} repo labs).`);
