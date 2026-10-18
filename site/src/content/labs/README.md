# Lab pages

Each lab is one markdown file in this folder. `template.md` is the page shape. Numbered files (`01-secret-exfiltration.md`, and so on) show up on the labs index in `order`.

`README.md` is not a lab. The site only loads `template.md` and files named `NN-something.md`.

## Add a lab

1. Copy `template.md` to `NN-short-name.md`. `NN` is the next two-digit number. The file name is the URL, so `04-egress-notes.md` is served at `/labs/04-egress-notes/`.
2. Set `title`, `summary`, `order`, `status` (`coming-soon` or `available`), and `kind: lab`.
3. Keep these seven level-2 headings, in order: Objectives, Prerequisites, Setup, Attack, Defend, Measure, Cleanup. Replace the template guidance with the lab.
4. From `site/`, run `npm run build`. The build fails if a heading is missing, or if site copy contains an em dash or an en dash.

Say "coming in the lab" when a command, policy, or score is not written yet. Do not invent stats or quotes. Attacks in these pages run only in isolated, local lab environments.
