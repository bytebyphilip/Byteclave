import { getCategories, listProducts } from '../firestore-helpers.js';
import { getCategoryMeta, lazyObserve, delegateAddToCart, renderCartCount, slugify } from '../app.js';

const CATEGORY = window.__BC_CATEGORY__ || '';

function iconForSub(name){
  // simple icon map
  const map = {
    'Prompt Libraries':'📚', 'Prompt Blueprints':'🧩', 'Prompt Market Packs':'🛍️', 'Automation Prompts':'⚙️',
    'PDFs & Cheat Sheets':'📄', 'AI Applications':'🤖', 'Templates & Tutorials':'📘', 'Scripts & Extensions':'🧪', 'API Projects':'🔗',
    'Android Apps':'🤖', 'Desktop Apps':'🖥️', 'Web Tools':'🌐', 'Plug-ins & Extensions':'🧩', 'Beta Tools / Experiments':'🧫',
    'AI & Machine Learning':'🧠', 'Prompt Engineering':'🧠', 'Automation & No-Code Tools':'⚙️', 'Tech Business & Monetization':'💼', 'Mini Lessons / Workshops':'🎓'
  };
  return map[name] || '📦';
}

const catSlugMap = { 'AI PROMPTS':'ai-prompts', 'AI TOOLS':'ai-tools', 'APPS':'apps', 'COURSES':'courses' };

function subcategoryCardHTML(catName, subName){
  const emoji = iconForSub(subName);
  const catSlug = catSlugMap[catName] || slugify(catName);
  const subSlug = slugify(subName);
  const href = `${catSlug}/${subSlug}.html`;
  return `<a class="card" href="${href}" data-sub="${subName}">
    <div class="content">
      <div class="badge">${emoji} ${subName}</div>
      <p style="color:#9fb0c9">Explore ${subName}</p>
    </div>
  </a>`;
}

function productCard(p){
  const price = p.price>0? `<span class="price">${p.price} ${p.currency||'KES'}</span>` : `<span class="badge free">FREE</span>`;
  const previewBtn = p.fileLink? `<a class="btn ghost" target="_blank" href="${p.fileLink}">Preview</a>` : '';
  return `<article class="card">
    <a class="thumb" ${p.image? '' : 'style="background:#0d111a"'}>
      ${p.image? `<img data-src="${p.image}" alt="${p.title}"/>` : ''}
    </a>
    <div class="content">
      <div class="badge">${p.subcategory||'Item'}</div>
      <h3>${p.title}</h3>
      <p style="color:#9fb0c9">${p.shortDescription||''}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <div>${price}</div>
        <div style="display:flex;gap:8px">${previewBtn}<button class="btn" data-add="${p.slug}">Add to cart</button></div>
      </div>
    </div>
  </article>`;
}

async function main(){
  const hero = document.getElementById('hero');
  const subGrid = document.getElementById('subGrid');
  const grid = document.getElementById('grid');
  const categories = await getCategories();
  const cat = categories.find(c=>c.name===CATEGORY) || { name: CATEGORY, subcategories: [] };
  const meta = getCategoryMeta(CATEGORY);
  hero.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">${meta.emoji||''}</span><h3 style="margin:0">${CATEGORY}</h3></div><p style="color:#9fb0c9">${cat.purpose||meta.purpose||''}</p>`;

  // Subcategory cards
  subGrid.innerHTML = (cat.subcategories||[]).map(s=> subcategoryCardHTML(CATEGORY, s)).join('');

  // When a subcategory is clicked, load products
  subGrid.addEventListener('click', async (e)=>{
    const a = e.target.closest('[data-sub]'); if (!a) return; e.preventDefault();
    const sub = a.getAttribute('data-sub');
    const items = await listProducts({ category: CATEGORY, subcategory: sub, limitNum: 500 });
    document.getElementById('count').textContent = `${items.length} items in ${sub}`;
    grid.innerHTML = items.map(productCard).join('');
    lazyObserve();
    delegateAddToCart(document.body);
  });

  // If this page is a dedicated subcategory page, render immediately
  const initialSub = window.__BC_SUB__ || '';
  if (initialSub){
    const items = await listProducts({ category: CATEGORY, subcategory: initialSub, limitNum: 500 });
    document.getElementById('count').textContent = `${items.length} items in ${initialSub}`;
    grid.innerHTML = items.map(productCard).join('');
    lazyObserve();
    delegateAddToCart(document.body);
  }

  renderCartCount();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

if (document.readyState !== 'loading') main(); else document.addEventListener('DOMContentLoaded', main);
