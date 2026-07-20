# sfun.cloud — portfolio hub

Landing page for [sfun.cloud](https://sfun.cloud): a single self-contained
`index.html` plus two Cloudflare Pages Functions that feed it live data.

```
index.html               ← the whole site (inline CSS + JS, no build step)
functions/
  api/medium.js          ← proxies + caches the Medium RSS feed as JSON
  api/github.js          ← proxies + caches GitHub repo stats (stars, activity)
```

## How the "dynamic" part works

- **GitHub stars / last-commit** on each project card come from `/api/github`,
  edge-cached for 1 hour. If the function isn't there (e.g. previewing the raw
  HTML file), the page falls back to calling GitHub's API directly, and if that
  fails too it just shows the static content. The page never breaks.
- **Medium posts** come from `/api/medium` (Medium's RSS is CORS-blocked in
  browsers, so the function proxies it). Baked-in fallback list renders
  instantly, then gets replaced with the live feed.
- Everything else — knowledge-graph hero animation, ⌘K command palette,
  hover-glow cards, scroll reveals — is client-side, no dependencies, no build.

## Deploy to Cloudflare Pages

### Option A — Git integration (recommended)

1. Push this folder to a GitHub repo (e.g. `Sumit1993/sfun-portfolio`).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the repo. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/`
4. Deploy. The `functions/` directory is picked up automatically.

### Option B — Direct upload from the CLI

```bash
npm i -g wrangler
wrangler pages deploy . --project-name sfun-portfolio
```

### Custom domain

Pages project → **Custom domains → Set up a custom domain** → `sfun.cloud`.
Since the zone is already on Cloudflare, it just adds a CNAME on the apex —
your existing `sreforge.sfun.cloud` and `mage-memory.sfun.cloud` subdomains
are untouched.

### Optional: GitHub token

`/api/github` works unauthenticated (edge cache keeps request volume tiny).
For headroom, add an env var in the Pages project settings:

- `GITHUB_TOKEN` — a fine-grained PAT with **public repo read-only** access.

## Editing content

All content lives in `index.html`:

- **Projects** → the `PROJECTS` array (name, description, tags, docs/GitHub links).
- **Posts fallback** → the `FALLBACK_POSTS` array (only shown if the live feed fails).
- **Copy** → hero, story, and about sections are plain HTML near the top.
- **Command palette entries** → the `COMMANDS` array.
