import { productCardHTML, lazyObserve, delegateAddToCart, renderCartCount, cache, DEFAULT_TAXONOMY, openModal, copyToClipboard, waLink, getCategoryMeta } from './app.js';
import { listProducts, getCategories, getAllTags } from './firestore-helpers.js';

const state = { page: 1, perPage: 12, items: [], filtered: [], categories: [] };

function $(id){ return document.getElementById(id); }

async function initFilters(){
  state.categories = await getCategories(DEFAULT_TAXONOMY);
  const url = new URL(location.href);
  const initialCategory = url.searchParams.get('category') || '';
  const initialSub = url.searchParams.get('subcategory') || '';
  const fCategory = $('fCategory');
  fCategory.innerHTML = `<option value="">All</option>` + state.categories.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
  fCategory.value = initialCategory;
  updateSubcategories();
  if (initialSub) $('fSubcategory').value = initialSub;
  const tags = await getAllTags();
  $('fTags').setAttribute('list','tags');
  let dl = document.createElement('datalist'); dl.id='tags'; dl.innerHTML = tags.map(t=>`<option value="${t}">`).join(''); document.body.appendChild(dl);
}

function updateSubcategories(){
  const fCategory = $('fCategory');
  const fSub = $('fSubcategory');
  const c = state.categories.find(x=>x.name===fCategory.value);
  const subs = c? c.subcategories : [];
  fSub.innerHTML = `<option value="">All</option>` + subs.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function readFilters(){
  const tagsStr = $('fTags').value.trim();
  return {
    category: $('fCategory').value || '',
    subcategory: $('fSubcategory').value || '',
    tags: tagsStr? tagsStr.split(',').map(s=>s.trim()).filter(Boolean) : [],
    search: $('fSearch').value.trim(),
    minPrice: Number($('fMin').value||0),
    maxPrice: Number($('fMax').value||Infinity),
    sort: $('fSort').value
  };
}

async function refresh(){
  const filters = readFilters();
  const items = await listProducts({ ...filters, limitNum: 500 });
  state.items = items;
  // cache for add-to-cart delegation
  try { cache.set('products_cache', items); } catch {}
  state.page = 1;
  applyPagination();
  renderCounts();
  renderCartCount();
}

function applyPagination(){
  const start = 0; const end = state.page * state.perPage;
  state.filtered = state.items.slice(0, end);
  const cat = $('fCategory').value;
  const sub = $('fSubcategory').value;
  // Category hero/sections
  const hero = $('categoryHero'); const sections = $('catSections'); const gridWrap = document.getElementById('gridWrap');
  if (cat){
    const meta = getCategoryMeta(cat);
    hero.style.display='block'; hero.classList.add('hero-banner');
    hero.innerHTML = `<div style=\"display:flex;align-items:center;gap:10px\"><span style=\"font-size:22px\">${meta.emoji||''}</span><h3 style=\"margin:0\">${cat}</h3></div><p style=\"color:#9fb0c9\">${(state.categories.find(c=>c.name===cat)||{}).purpose||meta.purpose||''}</p>`;
  }
  else { hero.style.display='none'; }
  sections.style.display = 'none';
  if (cat === 'AI PROMPTS') {
    $('grid').innerHTML = state.filtered.map(promptCardHTML).join('');
  } else if (cat === 'AI TOOLS' && sub === 'PDFs & Cheat Sheets'){
    $('grid').innerHTML = state.filtered.map(pdfCheatCardHTML).join('');
  } else if (cat === 'AI TOOLS' && sub === 'Scripts & Extensions'){
    $('grid').innerHTML = state.filtered.map(scriptCardHTML).join('');
  } else if (cat === 'AI TOOLS' && sub === 'AI Applications'){
    $('grid').innerHTML = state.filtered.map(appToolCardHTML).join('');
  } else if (cat === 'AI TOOLS' && sub === 'Templates & Tutorials'){
    $('grid').innerHTML = state.filtered.map(templateCardHTML).join('');
  } else if (cat === 'AI TOOLS' && sub === 'API Projects'){
    $('grid').innerHTML = state.filtered.map(apiProjectCardHTML).join('');
  } else if (cat === 'COURSES'){
    $('grid').innerHTML = state.filtered.map(courseCardHTML).join('');
  } else if (cat === 'APPS'){
    $('grid').innerHTML = state.filtered.map(appsVariantCardHTML).join('');
  } else {
    $('grid').innerHTML = state.filtered.map(productCardHTML).join('');
  }
  $('count').textContent = `${state.items.length} items`;
  lazyObserve();
}

function renderCounts(){
  const byCat = new Map();
  state.items.forEach(p => { byCat.set(p.category, (byCat.get(p.category)||0)+1); });
  const allNames = state.categories.map(c=>c.name);
  const html = allNames.map(name => {
    const meta = getCategoryMeta(name);
    return `<div style=\"display:flex;justify-content:space-between\"><a href=\"#\" data-jump-cat=\"${name}\">${meta.emoji||''} ${name}</a><span>${byCat.get(name)||0}</span></div>`;
  }).join('');
  $('catCounts').innerHTML = html;
  // Subcategory list when a category is picked
  const sideTitle = document.getElementById('sideTitle');
  const subList = document.getElementById('subList');
  const currentCat = document.getElementById('fCategory').value;
  if (currentCat){
    sideTitle.textContent = currentCat;
    const cat = state.categories.find(c=>c.name===currentCat);
    const subs = (cat && cat.subcategories)||[];
    subList.innerHTML = subs.map(s=>`<div><a href=\"#\" data-jump-sub=\"${s}\">${s}</a></div>`).join('') || '<div class="meta">No subcategories</div>';
  } else {
    sideTitle.textContent = 'Categories';
    subList.innerHTML = '';
  }
}

function bind(){
  $('fCategory').addEventListener('change', ()=>{ updateSubcategories(); refresh(); });
  ['fSubcategory','fTags','fSearch','fMin','fMax','fSort'].forEach(id=>$(id).addEventListener('input', ()=> refresh()));
  $('loadMore').addEventListener('click', ()=>{ state.page++; applyPagination(); });
  $('catCounts').addEventListener('click', (e)=>{
    const a = e.target.closest('[data-jump-cat]'); if (!a) return; e.preventDefault();
    $('fCategory').value = a.getAttribute('data-jump-cat'); updateSubcategories(); refresh();
  });
  document.getElementById('subList').addEventListener('click', (e)=>{
    const a = e.target.closest('[data-jump-sub]'); if (!a) return; e.preventDefault();
    $('fSubcategory').value = a.getAttribute('data-jump-sub'); refresh();
  });
  delegateAddToCart(document.body);
  // Copy prompt button handler
  document.body.addEventListener('click', (e)=>{
    const c = e.target.closest('[data-copy]'); if (c){ copyToClipboard(c.getAttribute('data-copy')); c.textContent = 'Copied'; setTimeout(()=> c.textContent='Copy', 1200); }
  });
  // Inline iframe preview buttons
  document.body.addEventListener('click', (e)=>{
    const i = e.target.closest('[data-iframe]'); if (!i) return; e.preventDefault();
    const src = i.getAttribute('data-iframe');
    openModal(`<iframe src="${src}" style="width:100%;height:70vh;border:0;background:#0b0d12"></iframe>`);
  });
}

async function main(){
  await initFilters();
  bind();
  await refresh();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

if (document.readyState !== 'loading') main(); else document.addEventListener('DOMContentLoaded', main);

// Category-specific renderers
function promptCardHTML(p){
  const tags = (p.tags||[]).map(t=>`<span class=\"badge\">${t}</span>`).join(' ');
  return `<article class=\"card\">
    <div class=\"content\">
      <div class=\"badge\">${p.subcategory||'Prompt'}</div>
      <h3>${p.title}</h3>
      <p style=\"color:#9fb0c9\">${p.shortDescription||''}</p>
      <div style=\"display:flex;gap:8px;flex-wrap:wrap\">${tags}</div>
      <div style=\"margin-top:8px;display:flex;gap:8px\">
        <button class=\"btn\" data-copy=\"${(p.description||'').replace(/<[^>]+>/g,'').slice(0,300)}\">Copy</button>
        ${p.fileLink? `<a class=\"btn secondary\" target=\"_blank\" href=\"${p.fileLink}\">View</a>`:''}
      </div>
    </div>
  </article>`;
}

function pdfCheatCardHTML(p){
  return `<article class=\"card\">
    <a href=\"#\" class=\"thumb\" data-preview=\"${encodeURIComponent(p.fileLink||'')}\"><img data-src=\"${p.image}\" alt=\"${p.title}\"/></a>
    <div class=\"content\">
      <div class=\"badge\">PDF</div>
      <h3>${p.title}</h3>
      <p style=\"color:#9fb0c9\">${p.shortDescription||''}</p>
      <div style=\"display:flex;gap:8px\">
        ${p.fileLink? `<button class=\"btn ghost\" data-preview=\"${encodeURIComponent(p.fileLink)}\">Preview</button>`:''}
        ${p.fileLink? `<a class=\"btn\" target=\"_blank\" href=\"${p.fileLink}\">Download</a>`:''}
      </div>
    </div>
  </article>`;
}

function scriptCardHTML(p){
  return `<article class=\"card\" style=\"padding:12px\">
    <div class=\"badge\">Script</div>
    <h3>${p.title}</h3>
    <p style=\"color:#9fb0c9\">${p.shortDescription||''}</p>
    <div style=\"display:flex;gap:8px\">
      ${p.fileLink? `<a class=\"btn\" target=\"_blank\" href=\"${p.fileLink}\">GitHub / Download</a>`:''}
      <button class=\"btn ghost\" data-copy=\"${(p.description||'').replace(/<[^>]+>/g,'').slice(0,300)}\">Copy Snippet</button>
    </div>
  </article>`;
}
