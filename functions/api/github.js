// Cloudflare Pages Function: GET /api/github
// Proxies the GitHub repos API so visitors never hit GitHub's 60 req/hr
// unauthenticated rate limit. Cached at the edge for 1 hour.
//
// Optional: set a GITHUB_TOKEN environment variable in the Pages project
// (Settings → Environment variables) for a 5000 req/hr limit. Works fine
// without it thanks to edge caching.

const USER = "Sumit1993";
const CACHE_SECONDS = 3600;

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request("https://sfun.cloud/__cache/api/github");

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const headers = {
    "User-Agent": "sfun.cloud-portfolio/1.0",
    Accept: "application/vnd.github+json",
  };
  const token = context.env && context.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  let repos = [];
  try {
    const [userRes, orgRes] = await Promise.all([
      fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`, { headers }),
      // PrismaLens lives in its own org, so fetch it explicitly.
      fetch(`https://api.github.com/repos/prismalens/prismalens`, { headers }),
    ]);
    let full = userRes.ok ? await userRes.json() : [];
    if (orgRes.ok) full = full.concat([await orgRes.json()]);
    if (full.length) {
      // Slim the payload — the page only needs a few fields.
      repos = full.map((r) => ({
        name: r.name,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        pushed_at: r.pushed_at,
        html_url: r.html_url,
        description: r.description,
        language: r.language,
      }));
    }
  } catch (err) {
    // fall through
    // fall through — client falls back to direct GitHub fetch, then baked data
  }

  const res = new Response(JSON.stringify(repos), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": `public, max-age=${repos.length > 1 ? CACHE_SECONDS : 60}`,
    },
  });
  if (repos.length > 1) context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
