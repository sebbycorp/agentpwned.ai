// @ts-check
import { defineConfig } from 'astro/config';

// agentpwned.ai is a custom domain, so the site is served from the domain
// root. Do not set a project-pages base such as /agentpwned.ai/.
export default defineConfig({
	site: 'https://agentpwned.ai',
	base: '/',
	build: {
		format: 'directory',
	},
});
