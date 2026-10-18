# agentpwned.ai

Educational labs for security engineers, platform engineers, and students. The site teaches why an AI agent needs a sandbox, how egress control and credential injection change what that agent can leak, and how to measure a bare agent against a sandboxed one.

Everything here runs on a local kind cluster, with canary secrets only. See [SECURITY.md](SECURITY.md).

## Labs

- [Lab 01: Secret Exfiltration](labs/01-secret-exfiltration/README.md). Status comes from [lab.md](labs/01-secret-exfiltration/lab.md) and is `draft`. The student pages are the step files under `labs/01-secret-exfiltration/steps/`. Arm A gives the agent a canary key. Arm B runs the same agent as an [Agent Substrate](https://github.com/agent-substrate/substrate) actor: the actor does not hold the key, an egress allowlist blocks the sink, and the gateway injects the key only toward the allowlisted vendor API. The default egress dataplane is Envoy. The lab does not use a `SandboxAgent` CRD.

The site renders Lab 01 from those files. Later labs can stay as placeholders in the site until a `labs/` folder exists.

## Layout

```text
README.md
DEPLOY.md          GitHub Pages and DNS
SECURITY.md
Makefile           scoring tests and Lab 01 cluster targets
.github/workflows/ site build on pull requests, Pages deploy on main
site/              Astro site
labs/              lab harnesses
scoring/           scorecards
```

Lab 01 instructor notes are [labs/01-secret-exfiltration/instructor.md](labs/01-secret-exfiltration/instructor.md). There is no top-level `instructor/` folder yet.

## Run the site locally

Requires Node.js 22.22 or newer (Astro 7).

```sh
cd site
npm install
npm run dev
```

Open http://127.0.0.1:4321.

`npm run build` writes the static site to `site/dist`. It checks lab headings, the `CNAME` file, and that site copy has no em dash or en dash. `npm run preview` serves that build.

## Run Lab 01

Follow [labs/01-secret-exfiltration/README.md](labs/01-secret-exfiltration/README.md). From the repo root:

```sh
make test
```

That runs the scoring unit tests. The `make lab01-*` targets bring clusters up and down. They need Docker and kind, and Arm B needs a Substrate checkout. Details are in the lab README.

## Add a lab

A lab the site publishes is a folder under `labs/`:

1. Add `labs/NN-short-name/lab.md` with frontmatter: `title`, `slug`, `status`, and optional `duration` and `difficulty`. The site shows `status` as written. `draft` is not "coming soon".
2. Add `labs/NN-short-name/README.md`. A single-page lab includes these level-2 headings, in order: Objectives, Prerequisites, Setup, Attack, Defend, Measure, Cleanup. Extra sections are allowed. A walkthrough lab keeps that file as a short overview and puts one step per file in `steps/01-name.md`, with Next and Back links. The site renders the overview at `/labs/NN-short-name/` and each step at `/labs/NN-short-name/01-name/`. Lab 01 is the walkthrough example.
3. Do not also keep `site/src/content/labs/NN-short-name.md`. The repo lab replaces that placeholder.
4. From `site/`, run `npm run build`.

A lab that is not written yet can be a placeholder markdown file in `site/src/content/labs/`, using the [page template](site/src/content/labs/template.md). See [site/src/content/labs/README.md](site/src/content/labs/README.md).

## Content rules

- Do not invent stats, quotes, or runtime behavior. Lab 01 is the source for what this repo says about Agent Substrate.
- No em dashes or en dashes in site copy. Lab writeups keep the punctuation they already have.
- Lab attacks stay on a local kind cluster, with canary secrets only.

## Deploy

GitHub Actions builds the site on every pull request. A push to `main` builds it and deploys `site/dist` to GitHub Pages. The domain and DNS steps are in [DEPLOY.md](DEPLOY.md). This repo does not change GitHub settings on its own.
