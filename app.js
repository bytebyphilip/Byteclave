// app.js - Shared utilities, taxonomy, SEO, cart, caching
// ByteClave — Your Digital Hub for AI, Apps & Resources
// Uses ES Modules; imported by multiple pages

export const ADMIN_PASSWORD = '1234'; // change in production
export const WHATSAPP_NUMBER = '+254791943551'; // change in production

// Category & Subcategory taxonomy (seed)
export const DEFAULT_TAXONOMY = [
  { name: 'PDF', icon: 'picture_as_pdf', purpose: 'downloadable guides, ebooks, reports.',
    subcategories: ['AI Guides','Tutorials','Cheatsheets'], tags: ['guide','pdf','ebook','ai','tutorial'], format: 'PDF' },
  { name: 'Apps', icon: 'apps', purpose: 'mobile/desktop app packages or links.',
    subcategories: ['Android','iOS','Desktop'], tags: ['apk','app','android','ios','desktop'], format: 'APK/APP' },
  { name: 'Tools & Scripts', icon: 'build', purpose: 'utilities, CLI tools, browser snippets, automation.',
    subcategories: ['CLI Tools','Web Tools','Automation Scripts'], tags: ['script','automation','cli','tool','extension'] },
  { name: 'Courses', icon: 'school', purpose: 'video/text courses sold or free.',
    subcategories: ['Beginner','Intermediate','Advanced'], tags: ['course','video','class','certificate'] },
  { name: 'Templates & UI Kits', icon: 'grid_view', purpose: 'design templates and UI kits.',
    subcategories: ['Figma','HTML/CSS','Tailwind Components'], tags: ['figma','template','ui-kit','design'] },
  { name: 'Plugins & Extensions', icon: 'extension', purpose: 'WP plugins, VSCode, browser.',
    subcategories: ['WordPress','VSCode','Browser (Chrome/Firefox)'], tags: ['plugin','extension','wordpress','vscode'] },
  { name: 'AI Models & Demos', icon: 'smart_toy', purpose: 'model packages, demos, datasets.',
    subcategories: ['Vision','NLP','Audio'], tags: ['model','nlp','vision','dataset'] },
  { name: 'Services & Consultations', icon: 'support_agent', purpose: 'paid services like consulting.',
    subcategories: ['Consulting','Custom Dev','Prompt Engineering'], tags: ['service','consult','dev','prompt-engineering'] },
  { name: 'Datasets & APIs', icon: 'dns', purpose: 'downloadable datasets or API instructions.',
    subcategories: ['Public Datasets','API Access'], tags: ['dataset','api','csv','json'] },
  { name: 'Misc / Other', icon: 'category', purpose: 'anything else not fitting above.',
    subcategories: [], tags: [] }
];

// Basic local storage cache helpers
export const cache = {
  get(key, maxAgeMs) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (maxAgeMs && Date.now() - obj.t > maxAgeMs) return null;
      return obj.v;
    } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })); } catch {}
  },
  del(key) { try { localStorage.removeItem(key); } catch {} }
};

// Slug utilities
export function slugify(input) {
  const base = input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
  return base;
}
export function ensureUniqueSlug(base, existing) {
  let candidate = base; let i = 1;
  const set = new Set(existing);
  while (set.has(candidate)) { candidate = `${base}-${i++}`; }
  return candidate;
}

// SEO helpers
export function setMeta({ title, description, image, url }) {
  if (title) document.title = title;
  setOrCreate('meta[name="description"]','content', description || '');
  setOrCreate('meta[property="og:title"]','content', title || '');
  setOrCreate('meta[property="og:description"]','content', description || '');
  if (image) setOrCreate('meta[property="og:image"]','content', image);
  if (url) setOrCreate('link[rel="canonical"]','href', url, 'link');
}
function setOrCreate(sel, attr, val, tagName = 'meta') {
  let el = document.querySelector(sel);
  if (!el) { el = document.createElement(tagName); if (tagName==='meta'){ const m = sel.match(/\[(.*?)\]/); if (m) { const [k,v] = m[1].split('='); el.setAttribute(k, v.replace(/\"/g,'')); } } document.head.appendChild(el); }
  if (val!=null) el.setAttribute(attr, val);
}

// Cart helpers (localStorage)
const CART_KEY = 'byteclave_cart_v1';
export function getCart() { return cache.get(CART_KEY) || { items: [] }; }
export function saveCart(cart) { cache.set(CART_KEY, cart); renderCartCount(); }
export function addToCart(product, qty=1) {
  const cart = getCart();
  const existing = cart.items.find(i => i.slug === product.slug);
  if (existing) existing.qty += qty; else cart.items.push({ slug: product.slug, title: product.title, price: product.price, currency: product.currency, image: product.image, qty });
  saveCart(cart);
}
export function removeFromCart(slug){ const cart = getCart(); cart.items = cart.items.filter(i=>i.slug!==slug); saveCart(cart);} 
export function clearCart(){ saveCart({items:[]}); }
export function renderCartCount(){ const el = document.querySelector('#cartCount'); if (el){ const n = (getCart().items||[]).reduce((a,b)=>a+b.qty,0); el.textContent = n>0? String(n):''; }}
export function cartWhatsAppLink(){
  const cart = getCart();
  const lines = cart.items.map(i=>`- ${i.title} x${i.qty} = ${i.price*i.qty} ${i.currency}`);
  const total = cart.items.reduce((a,b)=>a+(b.price*b.qty),0);
  const msg = encodeURIComponent(`Hello ByteClave, I want to order:\n${lines.join('\n')}\nTotal: ${total} KES`);
  const num = WHATSAPP_NUMBER.replace(/[^0-9]/g,'');
  return `https://wa.me/${num}?text=${msg}`;
}

// Lazy loading images
export function lazyObserve(){
  const obs = new IntersectionObserver((entries)=>{
    for (const e of entries){ if (e.isIntersecting){ const img = e.target; img.src = img.dataset.src; img.classList.remove('lazy'); obs.unobserve(img);} }
  });
  document.querySelectorAll('img[data-src]').forEach(img=>{ img.classList.add('lazy'); obs.observe(img); });
}

// Fetch helpers with fallback data
export async function fetchJSON(url, fallback){
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  } catch (e) { return fallback; }
}

// Render quick categories on home
async function renderHome(){
  const quick = document.getElementById('quickCats');
  if (!quick) return;
  quick.innerHTML = DEFAULT_TAXONOMY.slice(0,6).map(c=>`<div class="card"><div class="content"><div class="badge">${c.name}</div><p style="color:#9fb0c9">${c.purpose}</p><a class="btn ghost" href="products.html?category=${encodeURIComponent(c.name)}">Explore</a></div></div>`).join('');
  const featured = document.getElementById('featured');
  const products = await fetchJSON('data/sample-products.json', []);
  featured.innerHTML = products.slice(0,4).map(p=>productCardHTML(p)).join('');
  lazyObserve();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

export function productCardHTML(p){
  const price = p.price>0? `<span class="price">${p.price} ${p.currency}</span>` : `<span class="badge free">FREE</span>`;
  const sub = p.subcategory? `<div class="meta">${p.subcategory}</div>`:'';
  return `<article class="card">
    <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="thumb"><img data-src="${p.image}" alt="${p.title}"/></a>
    <div class="content">
      <div class="badge">${p.category}</div>
      <h3><a href="product.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a></h3>
      ${sub}
      <p style="color:#9fb0c9">${p.shortDescription}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        ${price}
        <button class="btn" data-add="${p.slug}">Add to cart</button>
      </div>
    </div>
  </article>`;
}

export function delegateAddToCart(root){
  root.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-add]');
    if (!t) return;
    const slug = t.getAttribute('data-add');
    const store = cache.get('products_cache')||[];
    const p = store.find(x=>x.slug===slug);
    if (p) addToCart(p,1);
  });
}

if (document.readyState !== 'loading') renderHome(); else document.addEventListener('DOMContentLoaded', renderHome);
