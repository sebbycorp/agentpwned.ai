import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { labsLoader } from './lib/labs-loader';

const labs = defineCollection({
	loader: labsLoader(),
	schema: z.object({
		title: z.string().min(1),
		summary: z.string().min(1),
		order: z.number().int().nonnegative(),
		status: z.string().min(1),
		kind: z.enum(['lab', 'template']),
		duration: z.string().optional(),
		difficulty: z.string().optional(),
	}),
});

export const collections = { labs };
