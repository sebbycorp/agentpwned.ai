# Lab pages

The site publishes two kinds of lab entries.

## A lab in the repo

`labs/NN-short-name/` is the source when that folder exists. Lab 01 is the example.

- `lab.md` frontmatter supplies `title`, `slug`, `status`, and optional `duration` and `difficulty`. The labs index shows `status` as written. `draft` is not "coming soon".
- `README.md` is the page body. Include these level-2 headings, in order: Objectives, Prerequisites, Setup, Attack, Defend, Measure, Cleanup. Extra sections are allowed.
- The URL is `/labs/NN-short-name/`.
- Do not keep a same-named file in this folder. The build rejects that duplicate.

## A placeholder

Until a `labs/` folder exists, add `NN-short-name.md` here. Copy `template.md`. Set `title`, `summary`, `order`, `status` (`coming-soon` or `available`), and `kind: lab`. The seven headings above must be the only level-2 headings, in that order.

`template.md` is the page shape. `README.md` in this folder is not a lab.

From `site/`, `npm run build` checks the headings. It also rejects an em dash or an en dash in site copy. Lab writeups under `labs/` keep their own punctuation.
