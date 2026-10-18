// Tutorial page behavior: copy buttons, per-browser progress, and the scorecard check.
// Everything stays in this browser. Nothing here makes a network request.
import { checkScorecard } from '../lib/scorecard.js';

const store = {
	get(key, fallback) {
		try {
			const raw = localStorage.getItem(key);
			return raw === null ? fallback : JSON.parse(raw);
		} catch {
			return fallback;
		}
	},
	set(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Private windows and blocked storage: the page still works, it just forgets.
		}
	},
};

function el(tag, attrs = {}, ...children) {
	const node = document.createElement(tag);
	for (const [key, value] of Object.entries(attrs)) {
		if (key === 'class') node.className = value;
		else node.setAttribute(key, value);
	}
	for (const child of children) node.append(child);
	return node;
}

// Inline `code` spans in messages, built with text nodes only.
function richText(message) {
	const span = el('span');
	message.split(/(`[^`]+`)/).forEach((part) => {
		span.append(part.startsWith('`') && part.endsWith('`') ? el('code', {}, part.slice(1, -1)) : part);
	});
	return span;
}

function setupCopyButtons(root) {
	for (const pre of root.querySelectorAll('pre')) {
		if (pre.parentElement?.classList.contains('code-wrap')) continue;
		const wrap = el('div', { class: 'code-wrap' });
		pre.replaceWith(wrap);
		wrap.append(pre);
		const button = el('button', { type: 'button', class: 'copy', 'aria-label': 'Copy command' }, 'Copy');
		button.addEventListener('click', async () => {
			const text = pre.innerText.replace(/\n$/, '');
			try {
				await navigator.clipboard.writeText(text);
				button.textContent = 'Copied';
			} catch {
				button.textContent = 'Select and copy';
			}
			setTimeout(() => (button.textContent = 'Copy'), 1600);
		});
		wrap.append(button);
	}
}

function setupProgress(article) {
	const lab = article.dataset.lab;
	const step = article.dataset.step;
	const key = `agentpwned:progress:${lab}`;
	const done = new Set(store.get(key, []));
	const links = [...article.querySelectorAll('[data-step-id]')];
	const counter = article.querySelector('[data-progress-count]');
	const toggle = article.querySelector('[data-step-done]');

	const paint = () => {
		for (const link of links) link.classList.toggle('done', done.has(link.dataset.stepId));
		const finished = links.filter((link) => done.has(link.dataset.stepId)).length;
		if (counter) {
			counter.hidden = false;
			counter.textContent = `${finished} of ${links.length} done`;
		}
		if (toggle) {
			const isDone = done.has(step);
			toggle.setAttribute('aria-pressed', String(isDone));
			toggle.textContent = isDone ? 'Step done. Undo' : 'Mark this step done';
		}
	};

	if (toggle && step !== 'overview') {
		toggle.hidden = false;
		toggle.addEventListener('click', () => {
			if (done.has(step)) done.delete(step);
			else done.add(step);
			store.set(key, [...done]);
			paint();
		});
	}
	paint();
}

const fmt = (value) => (value === null || value === undefined ? 'null' : String(value));

function verdictTable(card, verdict) {
	const body = el('tbody');
	for (const item of verdict.criteria) {
		body.append(
			el(
				'tr',
				{ class: item.pass ? 'ok' : 'bad' },
				el('td', {}, el('code', {}, item.name)),
				el('td', {}, fmt(item.expected)),
				el('td', {}, fmt(item.actual)),
				el('td', {}, item.pass ? 'PASS' : 'FAIL'),
			),
		);
	}
	body.append(
		el(
			'tr',
			{ class: verdict.injection_demo === 'pass' ? 'ok' : verdict.injection_demo === 'fail' ? 'bad' : '' },
			el('td', {}, el('code', {}, 'injection_demo')),
			el('td', {}, card.arm === 'bare' ? 'legit_api_injected false' : 'legit_api_injected true'),
			el('td', {}, fmt(card.legit_api_injected)),
			el('td', {}, verdict.injection_demo.toUpperCase()),
		),
	);
	return el(
		'table',
		{ class: 'verdict' },
		el('thead', {}, el('tr', {}, el('th', {}, 'Rule'), el('th', {}, 'Expected'), el('th', {}, 'Yours'), el('th', {}, 'Result'))),
		body,
	);
}

const COMPARE_ROWS = [
	'secret_visible_to_agent',
	'secret_in_agent_output',
	'secret_in_agent_logs',
	'exfil_attempts',
	'exfil_successes',
	'canary_token_hits',
	'egress_denies',
	'legit_api_injected',
	'atenet_dataplane',
	'exercise_pass',
	'injection_demo',
];

function compareTable(bare, substrate) {
	const body = el('tbody');
	for (const key of COMPARE_ROWS) {
		const changed = fmt(bare[key]) !== fmt(substrate[key]);
		body.append(
			el(
				'tr',
				{ class: changed ? 'changed' : '' },
				el('td', {}, el('code', {}, key)),
				el('td', {}, fmt(bare[key])),
				el('td', {}, fmt(substrate[key])),
			),
		);
	}
	return el(
		'figure',
		{ class: 'compare' },
		el('figcaption', {}, 'Arm A next to Arm B. Highlighted rows changed.'),
		el(
			'table',
			{ class: 'verdict' },
			el('thead', {}, el('tr', {}, el('th', {}, 'Metric'), el('th', {}, 'Arm A (bare)'), el('th', {}, 'Arm B (substrate)'))),
			body,
		),
	);
}

function setupScorecard(mount) {
	const arm = mount.dataset.scorecardCheck;
	const file = arm === 'bare' ? 'bare.json' : 'substrate.json';
	const id = `scorecard-${arm}`;
	const textarea = el('textarea', {
		id,
		rows: '8',
		spellcheck: 'false',
		placeholder: `Paste the contents of labs/01-secret-exfiltration/results/${file}`,
	});
	const picker = el('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden', id: `${id}-file` });
	const pick = el('label', { for: `${id}-file`, class: 'button secondary' }, `Open ${file}`);
	const run = el('button', { type: 'button', class: 'button' }, 'Check scorecard');
	const output = el('div', { class: 'scorecard-result', 'aria-live': 'polite' });

	const show = () => {
		output.replaceChildren();
		if (!textarea.value.trim()) return;
		const result = checkScorecard(textarea.value, arm);
		if (!result.ok) {
			output.append(el('p', { class: 'result-head bad' }, 'Not checked'));
			const list = el('ul');
			for (const error of result.errors) list.append(el('li', {}, richText(error)));
			output.append(list);
			return;
		}
		const { card, verdict } = result;
		const passed = verdict.exercise_pass;
		const lesson =
			arm === 'bare'
				? passed
					? 'Exercise PASS. The bare agent leaked the canary, which is the point of Arm A.'
					: 'Exercise FAIL. The attack did not land. Check that the agent could see the key and that the sink recorded a hit.'
				: passed
					? 'Exercise PASS. The actor never saw the canary and the sink stayed empty, even though the actor tried.'
					: 'Exercise FAIL. Compare each rule below with Step 6 before you go on.';
		output.append(el('p', { class: `result-head ${passed ? 'ok' : 'bad'}` }, lesson));
		output.append(verdictTable(card, verdict));
		if (result.warnings.length > 0) {
			const list = el('ul', { class: 'warnings' });
			for (const warning of result.warnings) list.append(el('li', {}, richText(warning)));
			output.append(list);
		}
		store.set(`agentpwned:scorecard:${arm}`, card);
		if (arm === 'substrate') {
			const bare = store.get('agentpwned:scorecard:bare', null);
			if (bare) output.append(compareTable(bare, card));
			else output.append(el('p', { class: 'hint' }, 'Check bare.json on Step 5 in this browser to see both arms side by side.'));
		}
	};

	const load = (blob) => {
		blob.text().then((text) => {
			textarea.value = text;
			show();
		});
	};
	picker.addEventListener('change', () => picker.files?.[0] && load(picker.files[0]));
	run.addEventListener('click', show);
	mount.addEventListener('dragover', (event) => {
		event.preventDefault();
		mount.classList.add('dragging');
	});
	mount.addEventListener('dragleave', () => mount.classList.remove('dragging'));
	mount.addEventListener('drop', (event) => {
		event.preventDefault();
		mount.classList.remove('dragging');
		const dropped = event.dataTransfer?.files?.[0];
		if (dropped) load(dropped);
	});

	const saved = store.get(`agentpwned:scorecard:${arm}`, null);
	if (saved) textarea.value = JSON.stringify(saved, null, 2);

	mount.classList.add('scorecard');
	mount.replaceChildren(
		el('label', { for: id, class: 'kicker' }, `Your ${file}`),
		textarea,
		el('div', { class: 'scorecard-actions' }, run, pick, picker),
		output,
	);
	if (saved) show();
}

const article = document.querySelector('article.tutorial');
if (article) {
	const body = article.querySelector('.lab-body');
	if (body) setupCopyButtons(body);
	setupProgress(article);
	for (const mount of article.querySelectorAll('[data-scorecard-check]')) setupScorecard(mount);
}
