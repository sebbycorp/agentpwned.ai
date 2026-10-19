import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader } from 'astro/loaders';
import { inlineBoards, rewriteTutorialLinks } from './tutorial';

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

export function stepsLoader(): Loader {
	return {
		name: 'agentpwned-steps',
		load: async ({ store, parseData, renderMarkdown, config }) => {
			store.clear();
			const sitePath = fileURLToPath(config.root);
			const repoRoot = join(sitePath, '..');
			const repoLabs = join(repoRoot, 'labs');
			if (!existsSync(repoLabs)) return;

			for (const entry of readdirSync(repoLabs, { withFileTypes: true })) {
				if (!entry.isDirectory() || !/^\d\d-/.test(entry.name)) continue;
				const stepsDir = join(repoLabs, entry.name, 'steps');
				if (!existsSync(stepsDir)) continue;
				const labFile = join(repoLabs, entry.name, 'lab.md');
				if (!existsSync(labFile)) continue;
				const meta = parseFrontmatter(readFileSync(labFile, 'utf8'));
				const labId = meta.data.slug || entry.name;
				const diagramsDir = join(repoLabs, entry.name, 'diagrams');
				const tracks = [
					['steps', 'scripted'],
					['hand', 'hand'],
				] as const;
				for (const [dirName, track] of tracks) {
					const dir = join(repoLabs, entry.name, dirName);
					if (!existsSync(dir)) continue;
					const files = readdirSync(dir)
						.filter((name) => /^\d\d-.+\.md$/.test(name))
						.sort();
					for (const name of files) {
						const full = join(dir, name);
						const parsed = parseFrontmatter(readFileSync(full, 'utf8'));
						if (!parsed.data.title || !parsed.data.summary) {
							throw new Error(`${entry.name}/${dirName}/${name} needs title and summary in frontmatter`);
						}
						for (const key of ['canary', 'sink', 'legit', 'plane']) {
							if (!parsed.data[key]) {
								throw new Error(`${entry.name}/${dirName}/${name} needs ${key} in frontmatter`);
							}
						}
						const stem = name.replace(/\.md$/, '');
						const body = inlineBoards(rewriteTutorialLinks(parsed.body, labId), diagramsDir);
						const id = `${labId}/${stem}`;
						const data = await parseData({
							id,
							data: {
								title: parsed.data.title,
								summary: parsed.data.summary,
								lab: labId,
								order: Number(name.slice(0, 2)),
								canary: parsed.data.canary,
								sink: parsed.data.sink,
								legit: parsed.data.legit,
								plane: parsed.data.plane,
								track,
								...(parsed.data.predict ? { predict: parsed.data.predict } : {}),
								...(parsed.data.reveal ? { reveal: parsed.data.reveal } : {}),
								...(parsed.data.answer ? { answer: parsed.data.answer } : {}),
							},
						});
						const rendered = await renderMarkdown(body, { fileURL: pathToFileURL(full) });
						store.set({
							id,
							data,
							body,
							filePath: relative(sitePath, full),
							rendered,
						});
					}
				}
			}
		},
	};
}
