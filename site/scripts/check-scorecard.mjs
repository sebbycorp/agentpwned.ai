// Checks site/src/lib/scorecard.js against scoring/lib/criteria.py and the
// result.v1 schema, so the browser check cannot drift from the real scorer.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkScorecard, evaluate } from '../src/lib/scorecard.js';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(siteRoot, '..');
const errors = [];

const cases = [];
for (const arm of ['bare', 'substrate'])
	for (const visible of [true, false])
		for (const hits of [0, 1, 2])
			for (const successes of [0, 1])
				for (const attempts of [0, 1, 2])
					for (const injected of [true, false, null])
						cases.push({
							arm,
							obs: {
								secret_visible_to_agent: visible,
								canary_token_hits: hits,
								exfil_successes: successes,
								exfil_attempts: attempts,
								legit_api_injected: injected,
							},
						});

const python = spawnSync(
	'python3',
	[
		'-c',
		[
			'import json, sys',
			`sys.path.insert(0, ${JSON.stringify(join(repoRoot, 'scoring'))})`,
			'from lib.criteria import evaluate',
			'print(json.dumps([evaluate(c["arm"], c["obs"]) for c in json.load(sys.stdin)]))',
		].join('\n'),
	],
	{ input: JSON.stringify(cases), encoding: 'utf8' },
);

if (python.error || python.status !== 0) {
	errors.push(`python3 could not run scoring/lib/criteria.py: ${python.error?.message ?? python.stderr}`);
} else {
	const expected = JSON.parse(python.stdout);
	cases.forEach((item, index) => {
		const ours = JSON.stringify(evaluate(item.arm, item.obs));
		const theirs = JSON.stringify(expected[index]);
		if (ours !== theirs) errors.push(`evaluate drift for ${JSON.stringify(item)}\n  js: ${ours}\n  py: ${theirs}`);
	});
}

const schema = JSON.parse(readFileSync(join(repoRoot, 'scoring/schema/result.v1.json'), 'utf8'));
const sample = {
	schema: schema.properties.schema.const,
	arm: 'bare',
	collected_at: '2026-10-18T20:52:08Z',
	duration_seconds: 0.157,
	secret_visible_to_agent: true,
	secret_in_agent_output: true,
	secret_in_agent_logs: true,
	exfil_attempts: 1,
	exfil_successes: 1,
	egress_denies: null,
	canary_token_hits: 1,
	legit_api_injected: false,
	atenet_dataplane: null,
	notes: [],
};
Object.assign(sample, evaluate('bare', sample));
const sampleKeys = Object.keys(sample).sort().join(',');
const schemaKeys = Object.keys(schema.properties).sort().join(',');
if (sampleKeys !== schemaKeys) errors.push(`schema fields changed. Update scorecard.js. schema: ${schemaKeys}`);

const good = checkScorecard(JSON.stringify(sample), 'bare');
if (!good.ok || good.warnings.length > 0) errors.push(`a valid bare scorecard was rejected: ${[...good.errors, ...good.warnings].join('; ')}`);
if (checkScorecard(JSON.stringify(sample), 'substrate').ok) errors.push('a bare scorecard passed the substrate step');
if (checkScorecard('{not json', 'bare').ok) errors.push('invalid JSON was accepted');
const edited = checkScorecard(JSON.stringify({ ...sample, canary_token_hits: 0, exfil_successes: 0 }), 'bare');
if (!edited.ok || edited.warnings.length === 0) errors.push('an edited exercise_pass did not raise a warning');

if (errors.length > 0) {
	console.error(`Scorecard check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
	process.exit(1);
}
console.log(`Scorecard check passed (${cases.length} cases match scoring/lib/criteria.py).`);
