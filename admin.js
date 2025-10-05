import { seedDefaultCategoriesIfEmpty, getCategories, validateCategorySelection, createProduct, listProducts, updateProduct, softDeleteProduct, restoreProduct, hardDeleteProduct, getAllTags, createArticle, listArticles, getRSSFeeds, setRSSFeeds, upsertCategory, deleteCategory } from './firestore-helpers.js';
import { uploadFile, detectFormatFromName } from './storage.js';
import { ADMIN_PASSWORD, slugify, ensureUniqueSlug } from './app.js';

function toast(msg){ const t = document.getElementById('toast'); t.textContent = msg; t.style.display = 'block'; setTimeout(()=> t.style.display='none', 2000); }

async function gate(){
  const ok = sessionStorage.getItem('byteclave_admin') === 'true' && Number(sessionStorage.getItem('admin_expiry')||0) > Date.now();
  if (ok) { document.getElementById('gate').style.display='none'; document.getElementById('dashboard').style.display='block'; await afterLogin(); return; }
  document.getElementById('btnLogin').addEventListener('click', async ()=>{
    const pwd = document.getElementById('pwd').value;
    if (pwd === ADMIN_PASSWORD){
      sessionStorage.setItem('byteclave_admin', 'true');
      sessionStorage.setItem('admin_expiry', String(Date.now()+3600*1000));
      document.getElementById('gate').style.display='none'; document.getElementById('dashboard').style.display='block';
      await afterLogin();
    } else { toast('Wrong password'); }
  });
}

let categories = [];

async function afterLogin(){
  await seedDefaultCategoriesIfEmpty();
  categories = await getCategories();
  bindTabs();
  initProductForm();
  await renderProductsTable();
  await initArticles();
  await initRSS();
  await initCategoriesManager();
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

function bindTabs(){
  document.querySelectorAll('[data-tab]').forEach(btn=> btn.addEventListener('click', ()=>{
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('[id^="tab-"]').forEach(v=> v.style.display='none');
    document.getElementById(`tab-${tab}`).style.display='block';
  }));
}

function fillCategorySelects(){
  const cat = document.getElementById('catSelect');
  cat.innerHTML = categories.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
  updateSubcategories();
}
function updateSubcategories(){
  const cat = document.getElementById('catSelect').value;
  const c = categories.find(x=>x.name===cat);
  const sub = document.getElementById('subSelect');
  const subs = c? c.subcategories : [];
  sub.innerHTML = `<option value="">${subs.length? 'Select' : 'None'}</option>` + subs.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function initProductForm(){
  fillCategorySelects();
  document.getElementById('catSelect').addEventListener('change', updateSubcategories);
  const form = document.getElementById('productForm');
  const titleEl = form.elements['title'];
  const slugEl = form.elements['slug'];
  const formatEl = form.elements['format'];
  titleEl.addEventListener('input', ()=>{ if (!slugEl.value) slugEl.value = slugify(titleEl.value); });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const tags = form.elements['tags'].value.split(',').map(s=>s.trim()).filter(Boolean);
    const category = form.elements['category'].value;
    const subcategory = form.elements['subcategory'].value;
    if (!validateCategorySelection(category, subcategory, categories)) { toast('Invalid category/subcategory'); return; }

    let imageUrl = '';
    const imageFile = document.getElementById('imageFile').files[0];
    if (imageFile) imageUrl = await uploadFile(imageFile, 'images/');

    const previewFiles = Array.from(document.getElementById('previewFiles').files||[]);
    const previewPages = [];
    for (const f of previewFiles){ previewPages.push(await uploadFile(f, 'previews/')); }

    let assetUrl = '';
    let fileSize = 0;
    let format = form.elements['format'].value;
    let externalLink = form.elements['externalLink'].value.trim();
    const assetFile = document.getElementById('assetFile').files[0];
    if (assetFile){ assetUrl = await uploadFile(assetFile, 'assets/'); fileSize = assetFile.size; if (!format) format = detectFormatFromName(assetFile.name); }
    if (!assetFile && externalLink){
      // Format guess from link
      const u = externalLink.toLowerCase();
      const guessed = ['.pdf','.apk','.zip','.vsix'].find(ext => u.endsWith(ext));
      if (!format && guessed) format = guessed.replace('.', '').toUpperCase();
    }
    // Convert file size to KB if too large
    if (fileSize > 0) fileSize = Math.round(fileSize / 1024);

    const payload = {
      title: form.elements['title'].value,
      slug: ensureUniqueSlug(slugify(slugEl.value || form.elements['title'].value), []),
      shortDescription: form.elements['shortDescription'].value,
      description: document.getElementById('desc').innerHTML,
      price: Number(form.elements['price'].value||0),
      currency: form.elements['currency'].value||'KES',
      category, subcategory, tags,
      image: imageUrl, previewPages,
      fileLink: externalLink || assetUrl, fileSize, format,
      license: form.elements['license'].value,
      published: document.getElementById('published').checked
    };
    // Simple validations
    if (!payload.title) { toast('Title required'); return; }
    if (!payload.category) { toast('Category required'); return; }
    const created = await createProduct(payload);
    toast('Saved product');
    form.reset(); document.getElementById('desc').innerHTML='';
    await renderProductsTable();
  });

  document.getElementById('resetForm').addEventListener('click', ()=>{ form.reset(); document.getElementById('desc').innerHTML=''; });

  // Suggested tags autocomplete
  getAllTags().then(tags => { const dl = document.createElement('datalist'); dl.id='tag-suggest'; dl.innerHTML = tags.map(t=>`<option value="${t}">`).join(''); document.body.appendChild(dl); form.elements['tags'].setAttribute('list','tag-suggest'); });
}

async function renderProductsTable(){
  const items = await listProducts({ limitNum: 500 });
  const rows = [`<tr><th>Title</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr>`]
    .concat(items.map(p=>`<tr>
      <td>${p.title}</td>
      <td>${p.category} / ${p.subcategory||''}</td>
      <td>${p.price} ${p.currency}</td>
      <td>${p.deleted? 'Deleted' : (p.published? 'Published':'Draft')}</td>
      <td>
        <a class="kbd" href="product.html?slug=${encodeURIComponent(p.slug)}" target="_blank">view</a>
        <button class="kbd" data-del="${p.id}">soft delete</button>
        <button class="kbd" data-res="${p.id}">restore</button>
        <button class="kbd" data-hard="${p.id}">delete</button>
      </td>
    </tr>`));
  document.getElementById('productsTable').innerHTML = rows.join('');
  document.getElementById('productsTable').addEventListener('click', async (e)=>{
    const d = e.target.closest('[data-del]'); const r = e.target.closest('[data-res]'); const h = e.target.closest('[data-hard]');
    if (d){ await softDeleteProduct(d.getAttribute('data-del')); toast('Moved to trash'); await renderProductsTable(); }
    if (r){ await restoreProduct(r.getAttribute('data-res')); toast('Restored'); await renderProductsTable(); }
    if (h){ if (confirm('Permanently delete?')){ await hardDeleteProduct(h.getAttribute('data-hard')); toast('Deleted'); await renderProductsTable(); } }
  }, { once: true });
}

async function initArticles(){
  const form = document.getElementById('articleForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    let imageUrl = '';
    const f = document.getElementById('aimage').files[0];
    if (f) imageUrl = await uploadFile(f, 'article-images/');
    const payload = {
      title: form.elements['title'].value,
      slug: form.elements['slug'].value || slugify(form.elements['title'].value),
      excerpt: form.elements['excerpt'].value,
      body: document.getElementById('abody').innerHTML,
      image: imageUrl,
      author: form.elements['author'].value || 'ByteClave Team',
      publishedAt: document.getElementById('apub').value ? new Date(document.getElementById('apub').value).toISOString() : new Date().toISOString(),
      externalUrl: null
    };
    await createArticle(payload);
    toast('Saved article');
    form.reset(); document.getElementById('abody').innerHTML='';
    await renderArticlesTable();
  });
  await renderArticlesTable();
}

async function renderArticlesTable(){
  const items = await listArticles({ limitNum: 200 });
  const rows = [`<tr><th>Title</th><th>Published</th><th>Link</th></tr>`].concat(items.map(a=>`<tr>
    <td>${a.title}</td>
    <td>${new Date(a.publishedAt).toLocaleString()}</td>
    <td><a class="kbd" target="_blank" href="${a.externalUrl? a.externalUrl : `article.html?slug=${encodeURIComponent(a.slug)}`}">open</a></td>
  </tr>`));
  document.getElementById('articlesTable').innerHTML = rows.join('');
}

async function initRSS(){
  const feeds = await getRSSFeeds();
  const ta = document.getElementById('feeds');
  ta.value = feeds.join('\n');
  document.getElementById('saveFeeds').addEventListener('click', async ()=>{
    await setRSSFeeds(ta.value.split('\n').map(s=>s.trim()).filter(Boolean));
    toast('Saved feeds');
  });
  document.getElementById('refreshNow').addEventListener('click', ()=>{ sessionStorage.removeItem('rss_cache'); toast('Refresh queued'); });
}

async function initCategoriesManager(){
  await renderCategoriesTable();
  const form = document.getElementById('catForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = {
      name: form.elements['name'].value.trim(),
      icon: form.elements['icon'].value.trim() || 'category',
      subcategories: form.elements['subcategories'].value.split(',').map(s=>s.trim()).filter(Boolean),
      tags: form.elements['tags'].value.split(',').map(s=>s.trim()).filter(Boolean)
    };
    await upsertCategory(data);
    categories = await getCategories();
    fillCategorySelects();
    await renderCategoriesTable();
    toast('Saved category');
  });
}

async function renderCategoriesTable(){
  const rows = [`<tr><th>Name</th><th>Subcategories</th><th>Tags</th><th>Actions</th></tr>`]
    .concat(categories.map(c=>`<tr>
      <td>${c.name}</td>
      <td>${(c.subcategories||[]).join(', ')}</td>
      <td>${(c.tags||[]).join(', ')}</td>
      <td><button class="kbd" data-del-cat="${c.name}">delete</button></td>
    </tr>`));
  const table = document.getElementById('catsTable');
  table.innerHTML = rows.join('');
  table.addEventListener('click', async (e)=>{
    const btn = e.target.closest('[data-del-cat]'); if (!btn) return;
    if (!confirm('Delete category?')) return;
    await deleteCategory(btn.getAttribute('data-del-cat'));
    categories = await getCategories();
    fillCategorySelects();
    await renderCategoriesTable();
  }, { once: true });
}

if (document.readyState !== 'loading') gate(); else document.addEventListener('DOMContentLoaded', gate);
