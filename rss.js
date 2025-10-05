// rss.js - RSS utilities (client)
export async function fetchFeed(url){
  try {
    const proxy = location.origin + '/api/rss-proxy?url=' + encodeURIComponent(url);
    const r = await fetch(proxy, { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch {}
  try {
    // Fallback to public rss2json API
    const r2 = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
    if (r2.ok) return await r2.json();
  } catch {}
  return { items: [] };
}
