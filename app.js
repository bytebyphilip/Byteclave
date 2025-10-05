// app.js - Shared utilities, taxonomy, SEO, cart, caching
// ByteClave — Your Digital Hub for AI, Apps & Resources
// Uses ES Modules; imported by multiple pages

export const ADMIN_PASSWORD = '1234'; // change in production
export const WHATSAPP_NUMBER = '+254791943551'; // change in production

// Category & Subcategory taxonomy (seed)
export const DEFAULT_TAXONOMY = [
  { name: 'AI PROMPTS', icon: 'library_books', purpose: 'Libraries, blueprints, packs, automation prompts',
    subcategories: ['Prompt Libraries','Prompt Blueprints','Prompt Market Packs','Automation Prompts'], tags: ['prompt','library','blueprint','automation'] },
  { name: 'AI TOOLS', icon: 'smart_toy', purpose: 'PDFs/Cheats, apps, templates, scripts, APIs',
    subcategories: ['PDFs & Cheat Sheets','AI Applications','Templates & Tutorials','Scripts & Extensions','API Projects'], tags: ['tools','pdf','app','template','script','api'] },
  { name: 'COURSES', icon: 'school', purpose: 'AI/ML, prompts, automation, monetization, workshops',
    subcategories: ['AI & Machine Learning','Prompt Engineering','Automation & No-Code Tools','Tech Business & Monetization','Mini Lessons / Workshops'], tags: ['course','video','lesson'] },
  { name: 'APPS', icon: 'apps', purpose: 'Android, Desktop, Web Tools, Extensions, Beta',
    subcategories: ['Android Apps','Desktop Apps','Web Tools','Plug-ins & Extensions','Beta Tools / Experiments'], tags: ['app','android','desktop','web','extension','beta'] }
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

// Global layout: splash, navbar hamburger, drawer, footer
function buildDrawerHTML(){
  const drawer = document.getElementById('drawer');
  if (!drawer) return;
  const wa = WHATSAPP_NUMBER.replace(/[^0-9]/g,'');
  drawer.innerHTML = `
    <h3 style="margin-top:0">ByteClave</h3>
    <nav>
      <a href="index.html">Home</a>
      <a href="products.html?category=${encodeURIComponent('Tools & Scripts')}">AI Tools</a>
      <a href="products.html?category=Apps">Apps</a>
      <a href="products.html?category=Courses">Courses</a>
      <a href="news.html">Articles / News</a>
      <a href="index.html#about">About ByteClave</a>
      <a href="https://wa.me/${wa}" target="_blank" rel="noopener">Contact / WhatsApp</a>
      <hr style="border-color:#1a2030"/>
      <a href="admin.html">Admin Dashboard</a>
    </nav>`;
}

function bindDrawer(){
  const btn = document.getElementById('menuBtn');
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  if (!btn || !drawer || !overlay) return;
  const open = ()=>{ drawer.classList.add('open'); overlay.classList.add('show'); };
  const close = ()=>{ drawer.classList.remove('open'); overlay.classList.remove('show'); };
  btn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });
}

function buildFooter(){
  const el = document.querySelector('.footer .links');
  if (!el) return;
  const wa = WHATSAPP_NUMBER.replace(/[^0-9]/g,'');
  el.innerHTML = `
    <a href="index.html">Home</a>
    <a href="products.html">Products</a>
    <a href="news.html">News</a>
    <a href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a>`;
}

function showSplashOnce(){
  if (sessionStorage.getItem('byteclave_splash_shown')==='1') return;
  const s = document.createElement('div');
  s.id = 'splash';
  s.innerHTML = `<div class="box">
    <h1 class="glow">ByteClave</h1>
    <p>Your Digital Hub for AI, Apps & Resources</p>
  </div>`;
  document.body.appendChild(s);
  setTimeout(()=>{ s.style.opacity = '0'; setTimeout(()=>{ s.remove(); sessionStorage.setItem('byteclave_splash_shown','1'); }, 500); }, 2200);
}

function initLayout(){
  buildDrawerHTML();
  bindDrawer();
  buildFooter();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  showSplashOnce();
  renderCartCount();
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

export function waLink(message){
  const num = WHATSAPP_NUMBER.replace(/[^0-9]/g,'');
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
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
  // Prefer live categories from Firestore via helper endpoint interface (optional). For now, render defaults.
  quick.innerHTML = DEFAULT_TAXONOMY.map(c=>`<div class=\"card\"><div class=\"content\"><div class=\"badge\">${c.name}</div><p style=\"color:#9fb0c9\">${c.purpose}</p><a class=\"btn ghost\" href=\"products.html?category=${encodeURIComponent(c.name)}\">Explore</a></div></div>`).join('');
  const featured = document.getElementById('featured');
  const products = await fetchJSON('data/sample-products.json', []);
  featured.innerHTML = products.slice(0,4).map(p=>productCardHTML(p)).join('');
  // cache for Add to cart delegation
  cache.set('products_cache', products);
  // enable add-to-cart buttons
  delegateAddToCart(document.body);
  lazyObserve();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

export function productCardHTML(p){
  const price = p.price>0? `<span class="price">${p.price} ${p.currency}</span>` : `<span class="badge free">FREE</span>`;
  const sub = p.subcategory? `<div class="meta">${p.subcategory}</div>`:'';
  const pdfControls = (p.category === 'PDF' && p.fileLink) ? `<button class=\"btn ghost\" data-preview=\"${encodeURIComponent(p.fileLink)}\">Preview</button>` : '';
  const catBadge = p.category === 'PDF' ? `📄 ${p.category}` : p.category;
  return `<article class="card">
    <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="thumb"><img data-src="${p.image}" alt="${p.title}"/></a>
    <div class="content">
      <div class="badge">${catBadge}</div>
      <h3><a href="product.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a></h3>
      ${sub}
      <p style="color:#9fb0c9">${p.shortDescription}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <div style="display:flex;gap:8px;align-items:center">${price}${pdfControls? `<span style=\"margin-left:8px\"></span>${pdfControls}`:''}</div>
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

// Preview overlay for PDF
function ensureOverlay(){
  let o = document.getElementById('previewOverlay');
  if (o) return o;
  o = document.createElement('div');
  o.id = 'previewOverlay';
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;z-index:9999;';
  o.innerHTML = `<div style="position:absolute;inset:5%;background:#0b0d12;border:1px solid #1a2030;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
    <div style="padding:8px;display:flex;justify-content:flex-end"><button id="closePreview" class="btn secondary">Close</button></div>
    <iframe id="previewFrame" style="flex:1;border:0;background:#111" src="about:blank"></iframe>
  </div>`;
  document.body.appendChild(o);
  o.addEventListener('click', (e)=>{ if (e.target.id==='previewOverlay') o.style.display='none'; });
  o.querySelector('#closePreview').addEventListener('click', ()=> o.style.display='none');
  return o;
}
export function showPreview(url){
  const o = ensureOverlay();
  const f = o.querySelector('#previewFrame');
  f.src = url;
  o.style.display = 'block';
}

// Delegate preview clicks globally
document.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-preview]');
  if (!t) return;
  e.preventDefault();
  const link = decodeURIComponent(t.getAttribute('data-preview'));
  showPreview(link);
});

// Generic modal for custom content
function ensureModal(){
  let m = document.getElementById('modalOverlay');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'modalOverlay';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;z-index:10000;';
  m.innerHTML = `<div style="position:absolute;inset:8% 12%;background:#0e1320;border:1px solid #1a2030;border-radius:12px;display:flex;flex-direction:column;overflow:auto">
    <div style="padding:10px;display:flex;justify-content:flex-end"><button id="closeModal" class="btn secondary">Close</button></div>
    <div id="modalContent" style="padding:16px"></div>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', (e)=>{ if (e.target.id==='modalOverlay') closeModal(); });
  m.querySelector('#closeModal').addEventListener('click', closeModal);
  return m;
}
export function openModal(html){ const m = ensureModal(); m.querySelector('#modalContent').innerHTML = html; m.style.display='block'; }
export function closeModal(){ const m = document.getElementById('modalOverlay'); if (m) m.style.display='none'; }

// Clipboard helper
export async function copyToClipboard(text){ try { await navigator.clipboard.writeText(text); } catch {} }

function boot(){
  initLayout();
  renderHome();
}
if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
