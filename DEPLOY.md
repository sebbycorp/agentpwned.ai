# Deploy

The site is a static Astro build. GitHub Actions publishes `site/dist` to GitHub Pages on every push to `main`. Pull requests only build.

Someone with admin access on the repository does the settings and DNS below in the GitHub UI and at the DNS host. Nothing in this repo changes repository settings.

## GitHub Pages settings

1. Open the repository on GitHub.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Publishing source: [Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow).

The workflow is `.github/workflows/site.yml`. It follows GitHub's Pages flow: `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`. See [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The first deploy on `main` fails until Source is set to GitHub Actions. Pull request builds do not deploy, so they still pass before that setting exists.

## Custom domain

The site is built for the domain root (`base: '/'` in `site/astro.config.mjs`) because `agentpwned.ai` is a custom domain, not a project path such as `/agentpwned.ai/`.

`site/public/CNAME` contains `agentpwned.ai`. Astro copies it to `site/dist/CNAME`, so the published artifact names the domain.

GitHub's docs say that when the publishing source is a GitHub Actions workflow, the custom domain is stored in repository settings, and a `CNAME` file in the artifact is ignored. Set the domain in Pages settings as well:

1. On **Settings > Pages**, under **Custom domain**, enter `agentpwned.ai` and save.
2. After DNS checks succeed, turn on **Enforce HTTPS**. GitHub says this option can take up to 24 hours to become available.

GitHub recommends verifying the domain before you add it, to reduce takeover risk: [Verifying your custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).

Custom domain reference: [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

HTTPS reference: [Securing your GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## DNS

Add the custom domain in Pages before you point DNS at GitHub. GitHub warns that publishing DNS first can leave the domain open to takeover.

DNS changes can take up to 24 hours to propagate. Do not use a wildcard record such as `*.agentpwned.ai`.

Values below are the GitHub Pages addresses documented for an apex domain, plus a `www` CNAME to this org's Pages host. Source: [Configuring an apex domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain) and [Configuring an apex domain and the www subdomain variant](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain-and-the-www-subdomain-variant).

### Apex `agentpwned.ai`

Create all four `A` records and all four `AAAA` records. GitHub recommends `A` records along with `AAAA` because IPv6 adoption is uneven.

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

Remove any default apex record your DNS host adds before these.

### `www.agentpwned.ai`

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `www` | `sebbycorp.github.io` |

Point the CNAME at `sebbycorp.github.io` only. Do not append the repository name, and do not point it at the `*.pages.github.io` host shown in the Pages settings.

With `agentpwned.ai` saved as the Pages custom domain, and both the apex records and this CNAME in place, GitHub redirects `www.agentpwned.ai` to `agentpwned.ai`.

Check from a machine with `dig`:

```sh
dig agentpwned.ai +noall +answer -t A
dig agentpwned.ai +noall +answer -t AAAA
dig www.agentpwned.ai +nostats +nocomments +nocmd
```

The `A` and `AAAA` answers should match the table. The `www` answer should show a CNAME to `sebbycorp.github.io`.
