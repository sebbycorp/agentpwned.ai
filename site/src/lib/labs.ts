import { getCollection, type CollectionEntry } from 'astro:content';

export const LAB_SECTIONS = [
	'Objectives',
	'Prerequisites',
	'Setup',
	'Attack',
	'Defend',
	'Measure',
	'Cleanup',
] as const;

export type LabEntry = CollectionEntry<'labs'>;

export function sectionId(name: string): string {
	return name.toLowerCase();
}

export function labNumber(order: number): string {
	return String(order).padStart(2, '0');
}

export function statusLabel(status: LabEntry['data']['status']): string {
	switch (status) {
		case 'coming-soon':
			return 'Coming soon';
		case 'available':
			return 'Ready';
		case 'template':
			return 'Template';
	}
}

export async function getLabs(): Promise<LabEntry[]> {
	const all = await getCollection('labs');
	return all.filter((entry) => entry.data.kind === 'lab').sort((a, b) => a.data.order - b.data.order);
}
