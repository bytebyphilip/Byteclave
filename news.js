import { listArticles, getRSSFeeds } from './firestore-helpers.js';
import { lazyObserve, renderCartCount } from './app.js';
import { fetchFeed } from './rss.js';

function articleCard(a){
  return `<article class="card">
    <a href="${a.externalUrl? a.externalUrl : `article.html?slug=${encodeURIComponent(a.slug)}` }" ${a.externalUrl? 'target="_blank" rel="noopener"':''} class="thumb"><img data-src="${a.image||'assets/default-news.jpg'}" alt="${a.title}"/></a>
    <div class="content">
      <h3><a href="${a.externalUrl? a.externalUrl : `article.html?slug=${encodeURIComponent(a.slug)}` }" ${a.externalUrl? 'target="_blank" rel="noopener"':''}>${a.title}</a></h3>
      <div class="meta">${new Date(a.publishedAt).toLocaleString()}</div>
      <p style="color:#9fb0c9">${a.excerpt||''}</p>
    </div>
  </article>`;
}

async function mergeRSS(local){
  const feeds = await getRSSFeeds();
  const results = await Promise.allSettled(feeds.map(f => fetchFeed(f)));
  const rssItems = [];
  for (const r of results){
    if (r.status==='fulfilled' && r.value && Array.isArray(r.value.items)){
      for (const it of r.value.items){
        rssItems.push({
          id: it.guid || it.link,
          title: it.title,
          slug: (it.title||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''),
          excerpt: it.description || '',
          body: '',
          image: (it.thumbnail || it.enclosure?.link || 'assets/default-news.jpg'),
          author: it.author || 'News',
          publishedAt: it.pubDate || new Date().toISOString(),
          externalUrl: it.link
        });
      }
    }
  }
  const all = [...local, ...rssItems];
  const seen = new Set();
  const dedup = all.filter(a=>{ const k = a.title + (a.externalUrl||''); if (seen.has(k)) return false; seen.add(k); return true; });
  dedup.sort((a,b)=> new Date(b.publishedAt) - new Date(a.publishedAt));
  return dedup.slice(0, 60);
}

async function refresh(){
  const local = await listArticles({ limitNum: 40 });
  const cacheKey = 'rss_cache';
  const cached = sessionStorage.getItem(cacheKey);
  let merged;
  if (cached) { try { merged = JSON.parse(cached); } catch {} }
  if (!merged) { merged = await mergeRSS(local); sessionStorage.setItem(cacheKey, JSON.stringify(merged)); }
  const q = document.getElementById('q').value.toLowerCase();
  const filtered = q? merged.filter(a => (a.title + ' ' + (a.excerpt||'')).toLowerCase().includes(q)) : merged;
  document.getElementById('articles').innerHTML = filtered.map(articleCard).join('');
  lazyObserve();
}

function bind(){
  document.getElementById('q').addEventListener('input', refresh);
  document.getElementById('refreshRSS').addEventListener('click', ()=>{ sessionStorage.removeItem('rss_cache'); refresh(); });
}

async function main(){
  bind();
  await refresh();
  renderCartCount();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

if (document.readyState !== 'loading') main(); else document.addEventListener('DOMContentLoaded', main);
