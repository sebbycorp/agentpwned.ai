import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { labsLoader } from './lib/labs-loader';
import { stepsLoader } from './lib/steps-loader';

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

const steps = defineCollection({
	loader: stepsLoader(),
	schema: z.object({
		title: z.string().min(1),
		summary: z.string().min(1),
		lab: z.string().min(1),
		order: z.number().int().positive(),
		canary: z.string().min(1),
		server: z.string().min(1),
		legit: z.string().min(1),
		plane: z.string().min(1),
		track: z.enum(['scripted', 'hand']).default('scripted'),
		predict: z.string().min(1).optional(),
		reveal: z.string().min(1).optional(),
		answer: z.string().min(1).optional(),
	}),
});

export const collections = { labs, steps };
