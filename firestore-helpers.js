// firestore-helpers.js (Firebase-free): Local-only data helpers for ByteClave
// Uses IndexedDB via localdb.js for all persistence.
import { localCreate, localUpdate, localDelete, localGet, localList, localUpsert } from './localdb.js';
import { DEFAULT_TAXONOMY, slugify, ensureUniqueSlug } from './app.js';

// Collections
const PRODUCTS = 'products';
const ARTICLES = 'articles';
const CATEGORIES = 'categories';
const SETTINGS = 'settings'; // rss config under doc: rss

// Seed categories if empty (local only)
export async function seedDefaultCategoriesIfEmpty() {
  const existing = await localList(CATEGORIES);
  if (existing.length) return false;
  for (const cat of DEFAULT_TAXONOMY){ await localUpsert(CATEGORIES, { id: cat.name, ...cat }); }
  return true;
}

export async function getCategories(fallback = DEFAULT_TAXONOMY) {
  const rows = await localList(CATEGORIES);
  if (rows.length) return rows;
  return fallback.map(m => ({ id: m.name, ...m }));
}

// Categories CRUD for Admin
export async function upsertCategory({ name, icon = 'category', purpose = '', subcategories = [], tags = [], format = null }) {
  if (!name) throw new Error('Category name is required');
  await localUpsert(CATEGORIES, { id: name, name, icon, purpose, subcategories, tags, format, updatedAt: new Date().toISOString() });
}

export async function deleteCategory(name) { if (name) await localDelete(CATEGORIES, name); }

export async function resetCategoriesToDefault(){
  const rows = await localList(CATEGORIES);
  for (const r of rows){ await localDelete(CATEGORIES, r.id); }
  for (const cat of DEFAULT_TAXONOMY){ await localUpsert(CATEGORIES, { id: cat.name, ...cat }); }
}

export function validateCategorySelection(categoryName, subcategoryName, categories) {
  const c = categories.find(x => x.name === categoryName);
  if (!c) return false;
  if (!subcategoryName) return c.subcategories.length === 0; // ok for Misc/Other
  return c.subcategories.includes(subcategoryName);
}

// Product helpers
export async function createProduct(input) {
  const now = new Date().toISOString();
  const existingSlugs = await fetchAllSlugs();
  const base = slugify(input.slug || input.title || 'item');
  const slug = ensureUniqueSlug(base, existingSlugs);
  const payload = { ...input, slug, price: Number(input.price||0), currency: input.currency||'KES', createdAt: now, updatedAt: now, deleted: false };
  return await localCreate(PRODUCTS, payload);
}

// Local fallback create product
export async function createProductLocal(input){ return await createProduct(input); }

export async function updateProduct(id, updates) { return await localUpdate(PRODUCTS, id, { ...updates, updatedAt: new Date().toISOString() }); }

export async function softDeleteProduct(id) { return await localUpdate(PRODUCTS, id, { deleted: true, updatedAt: new Date().toISOString() }); }

export async function restoreProduct(id) { return await localUpdate(PRODUCTS, id, { deleted: false, updatedAt: new Date().toISOString() }); }

export async function hardDeleteProduct(id) { return await localDelete(PRODUCTS, id); }

export async function getProductBySlug(slug) {
  const items = await localList(PRODUCTS);
  return items.find(p => p.slug === slug) || null;
}

export async function getProductById(id){ return await localGet(PRODUCTS, id); }

export async function listProducts({ category, subcategory, tags = [], search = '', minPrice = 0, maxPrice = Infinity, sort = 'newest', limitNum = 1000 } = {}) {
  let items = await localList(PRODUCTS);
  // Client-side filters
  items = items.filter(p => !p.deleted && p.published !== false);
  if (subcategory) items = items.filter(p => p.subcategory === subcategory);
  if (tags && tags.length) items = items.filter(p => p.tags && p.tags.some(t => tags.includes(t)));
  const qtext = (search||'').toLowerCase();
  if (qtext) items = items.filter(p => [p.title, p.shortDescription, (p.tags||[]).join(' '), p.slug].join(' ').toLowerCase().includes(qtext));
  if (sort === 'price-asc') items.sort((a,b)=> (a.price||0)-(b.price||0));
  if (sort === 'price-desc') items.sort((a,b)=> (b.price||0)-(a.price||0));
  if (sort === 'popular') items.sort((a,b)=> ((b.views||0)-(a.views||0)) );
  return items.slice(0, limitNum);
}

export async function fetchAllSlugs() { return (await localList(PRODUCTS)).map(p=>p.slug).filter(Boolean); }

export async function getAllTags(limitN = 1000) {
  const products = await listProducts({ limitNum: limitN });
  const set = new Set();
  products.forEach(p => (p.tags||[]).forEach(t => set.add(t)));
  return Array.from(set).sort();
}

// Articles (local only)
export async function createArticle(input) {
  const now = new Date().toISOString();
  const payload = { title: input.title||'', slug: input.slug || slugify(input.title||'article'), excerpt: input.excerpt||'', body: input.body||'', image: input.image||'', author: input.author||'ByteClave Team', publishedAt: input.publishedAt || now, externalUrl: input.externalUrl||null };
  return await localCreate(ARTICLES, payload);
}

export async function updateArticle(id, updates){ return await localUpdate(ARTICLES, id, { ...updates, updatedAt: new Date().toISOString() }); }

export async function deleteArticle(id){ return await localDelete(ARTICLES, id); }

export async function listArticles({ limitNum = 50 } = {}) {
  const all = await localList(ARTICLES);
  return all.sort((a,b)=> new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0, limitNum);
}

export async function getArticleBySlug(slug) { return (await localList(ARTICLES)).find(a=>a.slug===slug)||null; }

// RSS settings
export async function getRSSFeeds() { return ['https://news.google.com/rss/search?q=AI+technology&hl=en-US&gl=US&ceid=US:en']; }
export async function setRSSFeeds(_feeds) { return; }
