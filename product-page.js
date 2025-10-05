import { getProductBySlug } from './firestore-helpers.js';
import { addToCart, cartWhatsAppLink, setMeta, renderCartCount, lazyObserve } from './app.js';

function q(name){ return new URLSearchParams(location.search).get(name); }

function productDetailHTML(p){
  const price = p.price>0? `<span class="price">${p.price} ${p.currency}</span>` : `<span class="badge free">FREE</span>`;
  const previews = (p.previewPages||[]).map(src=>`<img data-src="${src}" alt="preview"/>`).join('');
  const pdfPreview = p.format==='PDF' && p.fileLink? `<a class="btn secondary" href="${p.fileLink}" target="_blank" rel="noopener">Preview PDF</a>`:'';
  const platformBadges = p.category==='Apps' ? `<div class="meta">${p.subcategory}</div>` : '';
  return `<article class="card" style="padding:16px">
    <div class="badge">${p.category}</div>
    <h1>${p.title}</h1>
    <div class="meta">${p.subcategory || ''}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:10px">
      <div><img data-src="${p.image}" alt="${p.title}"/></div>
      <div>
        <p style="color:#9fb0c9">${p.shortDescription}</p>
        ${platformBadges}
        <div style="display:flex;gap:10px;align-items:center">${price}
          <button id="addCart" class="btn">Add to cart</button>
          <a id="waCheckout" class="btn secondary" target="_blank" href="#">WhatsApp Checkout</a>
        </div>
        <div style="margin-top:10px">${pdfPreview}
          ${p.fileLink? `<a class="btn ghost" style="margin-left:10px" href="${p.fileLink}" target="_blank" rel="noopener">Download / Link</a>`:''}
        </div>
        <div style="margin-top:12px"><span class="label">Tags:</span> ${(p.tags||[]).map(t=>`<span class="badge" style="margin-right:6px">${t}</span>`).join('')}</div>
      </div>
    </div>
    <div style="margin-top:16px">
      <h3>Description</h3>
      <div>${p.description||''}</div>
    </div>
    ${previews? `<div style="margin-top:16px"><h3>Previews</h3><div class="grid">${previews}</div></div>`:''}
  </article>`;
}

function setSEO(p){
  setMeta({
    title: `${p.title} — ByteClave`,
    description: p.shortDescription,
    image: p.image,
    url: location.href
  });
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.shortDescription,
    image: p.image,
    sku: p.slug,
    offers: {
      '@type': 'Offer',
      priceCurrency: p.currency||'KES',
      price: String(p.price||0),
      availability: 'https://schema.org/InStock'
    }
  };
  document.getElementById('jsonld').textContent = JSON.stringify(jsonld);
}

async function main(){
  const slug = q('slug');
  const p = await getProductBySlug(slug);
  if (!p) { document.getElementById('detail').innerHTML = '<p>Not found.</p>'; return; }
  document.getElementById('detail').innerHTML = productDetailHTML(p);
  setSEO(p);
  renderCartCount();
  lazyObserve();
  document.getElementById('addCart').addEventListener('click', ()=>{ addToCart(p,1); });
  document.getElementById('waCheckout').setAttribute('href', cartWhatsAppLink());
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

if (document.readyState !== 'loading') main(); else document.addEventListener('DOMContentLoaded', main);
