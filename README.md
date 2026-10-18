# agentpwned.ai

Educational labs for security engineers, platform engineers, and students. The site teaches why an AI agent needs a sandbox, how egress control and credential injection change what that agent can leak, and how to measure a bare agent against a sandboxed one.

The labs will use [Agent Substrate](https://github.com/agent-substrate/substrate) and kagent [SandboxAgent](https://kagent.dev). Runnable setup for those tools is coming in the lab. This repo does not claim product behavior that a lab has not shown.

All lab attacks run only in isolated, local lab environments.

## Layout

The site lives in `site/` so later lab material can sit beside it:

```text
README.md          this file
DEPLOY.md          GitHub Pages and DNS for agentpwned.ai
.github/workflows/ site build on pull requests, Pages deploy on main
site/              Astro static site
labs/              reserved for future lab harnesses
scoring/           reserved for future scoring
instructor/        reserved for future instructor notes
```

`labs/`, `scoring/`, and `instructor/` are not created yet. Astro does not need the repo root, so the site stays in `site/` and those folders can be added without moving the site.

## Run the site locally

Requires Node.js 22.22 or newer (Astro 7).

```sh
cd site
npm install
npm run dev
```

Open http://127.0.0.1:4321.

`npm run build` writes the static site to `site/dist` and checks lab headings, the `CNAME` file, and that site copy has no em dash or en dash. `npm run preview` serves that build.

## Add a lab

A lab is one markdown file in `site/src/content/labs/`. See also `site/src/content/labs/README.md` and the [page template](site/src/content/labs/template.md).

1. Copy `site/src/content/labs/template.md` to `site/src/content/labs/NN-short-name.md`. `NN` is the next two-digit number. The file name is the URL, so `04-egress-notes.md` is served at `/labs/04-egress-notes/`.
2. Set `title`, `summary`, `order`, `status` (`coming-soon` or `available`), and `kind: lab`.
3. Keep these seven level-2 headings, in order: Objectives, Prerequisites, Setup, Attack, Defend, Measure, Cleanup. Replace the template guidance with the lab.
4. From `site/`, run `npm run build`. The build fails if a heading is missing, or if site copy contains an em dash or an en dash.

## Content rules

- Do not invent stats, quotes, or Agent Substrate behavior. If the setup is not written yet, say it is coming in the lab.
- No em dashes or en dashes in site copy.
- Lab attacks stay in isolated, local lab environments.

## Deploy

GitHub Actions builds the site on every pull request. A push to `main` builds it and deploys `site/dist` to GitHub Pages. The domain and DNS steps are in [DEPLOY.md](DEPLOY.md). This repo does not change GitHub settings on its own.
