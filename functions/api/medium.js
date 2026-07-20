// Cloudflare Pages Function: GET /api/medium
// Proxies the Medium RSS feed (CORS-blocked in browsers) and returns clean JSON.
// Cached at the edge for 1 hour.

const FEED_URL = "https://medium.com/feed/@desolatte";
const CACHE_SECONDS = 3600;

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request("https://sfun.cloud/__cache/api/medium");

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let items = [];
  try {
    const feedRes = await fetch(FEED_URL, {
      headers: { "User-Agent": "sfun.cloud-portfolio/1.0" },
    });
    if (feedRes.ok) {
      const xml = await feedRes.text();
      items = parseFeed(xml);
    }
  } catch (err) {
    // fall through — client has baked-in fallback data
  }

  const res = new Response(JSON.stringify({ items }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": `public, max-age=${CACHE_SECONDS}`,
    },
  });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

function parseFeed(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of itemBlocks) {
    const pick = (tag) => {
      const m = block.match(
        new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)
      );
      return m ? m[1].trim() : "";
    };
    const categories = [];
    const catRe = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g;
    let cm;
    while ((cm = catRe.exec(block)) !== null) categories.push(cm[1].trim());

    items.push({
      title: pick("title"),
      link: (pick("link") || "").split("?")[0],
      pubDate: pick("pubDate"),
      categories,
    });
  }
  return items;
}
