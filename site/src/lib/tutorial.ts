import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function rewriteTutorialLinks(markdown: string, labId: string): string {
	const stepHref = `](/labs/${labId}/$1/)`;
	return markdown
		.replace(/\]\(\.\.\/README\.md\)/g, `](/labs/${labId}/)`)
		.replace(/\]\(steps\/(\d\d-[^)\s]+)\.md\)/g, stepHref)
		.replace(/\]\((\d\d-[^)\s]+)\.md\)/g, stepHref);
}

export function inlineBoards(markdown: string, diagramsDir: string): string {
	return markdown.replace(/!\[([^\]]*)\]\((?:\.\.\/)?diagrams\/([a-z0-9.-]+\.svg)\)/g, (full, alt: string, file: string) => {
		const svgPath = join(diagramsDir, file);
		if (!existsSync(svgPath)) return full;
		const svg = readFileSync(svgPath, 'utf8')
			.replace(/^\s*<\?xml[^>]*>\s*/i, '')
			.replace(/\s(?:role|aria-[\w-]+)="[^"]*"/g, '');
		const caption = alt.replace(/[<>&]/g, '');
		return `<figure class="board draw">\n${svg}\n<figcaption>${caption}</figcaption>\n</figure>`;
	});
}
