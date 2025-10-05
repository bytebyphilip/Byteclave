// OPTIONAL: rss-proxy.js - serverless function example (Netlify/Cloudflare/Vercel)
// Purpose: fetch third-party RSS XML and return JSON to avoid CORS issues.
// Deploy this as an edge function and route /api/rss-proxy

export default async function handler(req, res){
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'Upstream failed' });
    const xml = await r.text();
    // Minimal conversion using a simple regex-based parser
    const items = Array.from(xml.matchAll(/<item>[\s\S]*?<\/item>/g)).map(m => {
      const x = m[0];
      const g = (tag)=> (x.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`))||[])[1] || '';
      return {
        title: g('title'),
        link: g('link'),
        guid: g('guid'),
        description: g('description'),
        pubDate: g('pubDate')
      };
    });
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ items }));
  } catch (e) { res.status(500).json({ error: 'Proxy error' }); }
}
