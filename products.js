import { productCardHTML, lazyObserve, delegateAddToCart, renderCartCount, cache, DEFAULT_TAXONOMY } from './app.js';
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
  $('grid').innerHTML = state.filtered.map(productCardHTML).join('');
  $('count').textContent = `${state.items.length} items`;
  lazyObserve();
}

function renderCounts(){
  const byCat = new Map();
  state.items.forEach(p => { byCat.set(p.category, (byCat.get(p.category)||0)+1); });
  const allNames = state.categories.map(c=>c.name);
  const html = allNames.map(name => `<div style="display:flex;justify-content:space-between"><a href="#" data-jump-cat="${name}">${name}</a><span>${byCat.get(name)||0}</span></div>`).join('');
  $('catCounts').innerHTML = html;
}

function bind(){
  $('fCategory').addEventListener('change', ()=>{ updateSubcategories(); refresh(); });
  ['fSubcategory','fTags','fSearch','fMin','fMax','fSort'].forEach(id=>$(id).addEventListener('input', ()=> refresh()));
  $('loadMore').addEventListener('click', ()=>{ state.page++; applyPagination(); });
  $('catCounts').addEventListener('click', (e)=>{
    const a = e.target.closest('[data-jump-cat]'); if (!a) return; e.preventDefault();
    $('fCategory').value = a.getAttribute('data-jump-cat'); updateSubcategories(); refresh();
  });
  delegateAddToCart(document.body);
}

async function main(){
  await initFilters();
  bind();
  await refresh();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

if (document.readyState !== 'loading') main(); else document.addEventListener('DOMContentLoaded', main);
