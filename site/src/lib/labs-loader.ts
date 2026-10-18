import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader } from 'astro/loaders';

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return { data: {}, body: raw };
	const data: Record<string, string> = {};
	for (const line of match[1].split(/\r?\n/)) {
		const index = line.indexOf(':');
		if (index === -1) continue;
		const key = line.slice(0, index).trim();
		const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
		if (key) data[key] = value;
	}
	return { data, body: match[2] };
}

function stripTitle(markdown: string): string {
	return markdown.replace(/^#\s+.+\r?\n+/, '');
}

function firstParagraph(markdown: string): string {
	const lines = stripTitle(markdown).split(/\r?\n/);
	const paragraph: string[] = [];
	for (const line of lines) {
		if (!line.trim()) {
			if (paragraph.length > 0) break;
			continue;
		}
		if (/^#{1,6}\s/.test(line) || line.startsWith('-') || line.startsWith('|') || line.startsWith('```')) {
			break;
		}
		paragraph.push(line.trim());
	}
	return paragraph.join(' ');
}

export function labsLoader(): Loader {
	return {
		name: 'agentpwned-labs',
		load: async ({ store, parseData, renderMarkdown, config, logger }) => {
			store.clear();
			const sitePath = fileURLToPath(config.root);
			const repoRoot = join(sitePath, '..');
			const repoLabs = join(repoRoot, 'labs');
			const published = new Set<string>();

			if (existsSync(repoLabs)) {
				for (const entry of readdirSync(repoLabs, { withFileTypes: true })) {
					if (!entry.isDirectory() || !/^\d\d-/.test(entry.name)) continue;
					const folder = join(repoLabs, entry.name);
					const labFile = join(folder, 'lab.md');
					const readmeFile = join(folder, 'README.md');
					if (!existsSync(labFile) || !existsSync(readmeFile)) {
						logger.warn(`${entry.name} needs lab.md and README.md. Skipping.`);
						continue;
					}

					const meta = parseFrontmatter(readFileSync(labFile, 'utf8'));
					const id = meta.data.slug || entry.name;
					const readme = readFileSync(readmeFile, 'utf8');
					const body = stripTitle(readme);
					const summary = firstParagraph(readme);
					if (!meta.data.title || !meta.data.status || !summary) {
						throw new Error(`${entry.name}/lab.md needs title and status, and README.md needs an opening paragraph`);
					}

					const data = await parseData({
						id,
						data: {
							title: meta.data.title,
							summary,
							order: Number(id.slice(0, 2)),
							status: meta.data.status,
							kind: 'lab',
							...(meta.data.duration ? { duration: meta.data.duration } : {}),
							...(meta.data.difficulty ? { difficulty: meta.data.difficulty } : {}),
						},
					});
					const rendered = await renderMarkdown(body, { fileURL: pathToFileURL(readmeFile) });
					store.set({
						id,
						data,
						body,
						filePath: relative(sitePath, readmeFile),
						rendered,
					});
					published.add(id);
				}
			}

			const contentDir = join(sitePath, 'src/content/labs');
			for (const name of readdirSync(contentDir)) {
				if (name === 'README.md' || !name.endsWith('.md')) continue;
				if (!/^\d\d-.+\.md$/.test(name) && name !== 'template.md') continue;
				const id = name.replace(/\.md$/, '');
				if (published.has(id)) {
					logger.info(`${id} comes from labs/${id}. Ignoring site/src/content/labs/${name}.`);
					continue;
				}
				const filePath = join(contentDir, name);
				const parsed = parseFrontmatter(readFileSync(filePath, 'utf8'));
				const data = await parseData({
					id,
					data: {
						title: parsed.data.title,
						summary: parsed.data.summary,
						order: Number(parsed.data.order),
						status: parsed.data.status,
						kind: parsed.data.kind,
					},
				});
				const rendered = await renderMarkdown(parsed.body, { fileURL: pathToFileURL(filePath) });
				store.set({
					id,
					data,
					body: parsed.body,
					filePath: `src/content/labs/${name}`,
					rendered,
				});
			}
		},
	};
}
