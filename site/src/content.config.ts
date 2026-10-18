import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const labs = defineCollection({
	loader: glob({
		pattern: ['[0-9][0-9]-*.md', 'template.md'],
		base: './src/content/labs',
		generateId: ({ entry }) => entry.replace(/\.md$/, ''),
	}),
	schema: z.object({
		title: z.string().min(1),
		summary: z.string().min(1),
		order: z.number().int().nonnegative(),
		status: z.enum(['coming-soon', 'available', 'template']),
		kind: z.enum(['lab', 'template']),
	}),
});

export const collections = { labs };
