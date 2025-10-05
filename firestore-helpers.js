// firestore-helpers.js - Firestore CRUD and seeding utilities
import { db, serverTimestamp } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, writeBatch
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { DEFAULT_TAXONOMY, slugify, ensureUniqueSlug } from './app.js';

// Collections
const PRODUCTS = 'products';
const ARTICLES = 'articles';
const CATEGORIES = 'categories';
const SETTINGS = 'settings'; // rss config under doc: rss

// Seed categories if empty
export async function seedDefaultCategoriesIfEmpty() {
  try {
    const snap = await getDocs(collection(db, CATEGORIES));
    if (!snap.empty) return false;
    const batch = writeBatch(db);
    DEFAULT_TAXONOMY.forEach(cat => {
      const id = cat.name; // use name as id for simplicity
      const ref = doc(db, CATEGORIES, id);
      batch.set(ref, { name: cat.name, icon: cat.icon || 'category', purpose: cat.purpose||'', subcategories: cat.subcategories||[], tags: cat.tags||[], format: cat.format||null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    await batch.commit();
    return true;
  } catch (e) { console.warn('seedDefaultCategoriesIfEmpty failed', e); return false; }
}

export async function getCategories(fallback = DEFAULT_TAXONOMY) {
  try {
    const snap = await getDocs(collection(db, CATEGORIES));
    if (snap.empty) return fallback.map(m => ({ id: m.name, ...m }));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { return fallback.map(m => ({ id: m.name, ...m })); }
}

// Categories CRUD for Admin
export async function upsertCategory({ name, icon = 'category', purpose = '', subcategories = [], tags = [], format = null }) {
  if (!name) throw new Error('Category name is required');
  const ref = doc(db, CATEGORIES, name);
  await setDoc(ref, { name, icon, purpose, subcategories, tags, format, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteCategory(name) {
  if (!name) return;
  const ref = doc(db, CATEGORIES, name);
  await deleteDoc(ref);
}

export async function resetCategoriesToDefault(){
  const snap = await getDocs(collection(db, CATEGORIES));
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  DEFAULT_TAXONOMY.forEach(cat => {
    const ref = doc(db, CATEGORIES, cat.name);
    batch.set(ref, { name: cat.name, icon: cat.icon || 'category', purpose: cat.purpose||'', subcategories: cat.subcategories||[], tags: cat.tags||[], format: cat.format||null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  await batch.commit();
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

  const payload = {
    title: input.title || '',
    slug,
    shortDescription: input.shortDescription || '',
    description: input.description || '',
    price: Number(input.price||0),
    currency: input.currency || 'KES',
    category: input.category || 'Misc / Other',
    subcategory: input.subcategory || '',
    tags: Array.isArray(input.tags) ? input.tags : [],
    image: input.image || '',
    previewPages: Array.isArray(input.previewPages)? input.previewPages : [],
    fileLink: input.fileLink || '',
    fileSize: Number(input.fileSize||0),
    format: input.format || '',
    license: input.license || '',
    published: Boolean(input.published),
    createdAt: now,
    updatedAt: now,
    deleted: false
  };
  const ref = await addDoc(collection(db, PRODUCTS), payload);
  return { id: ref.id, ...payload };
}

export async function updateProduct(id, updates) {
  const ref = doc(db, PRODUCTS, id);
  await updateDoc(ref, { ...updates, updatedAt: new Date().toISOString() });
}

export async function softDeleteProduct(id) {
  const ref = doc(db, PRODUCTS, id);
  await updateDoc(ref, { deleted: true, updatedAt: new Date().toISOString() });
}

export async function restoreProduct(id) {
  const ref = doc(db, PRODUCTS, id);
  await updateDoc(ref, { deleted: false, updatedAt: new Date().toISOString() });
}

export async function hardDeleteProduct(id) {
  const ref = doc(db, PRODUCTS, id);
  await deleteDoc(ref);
}

export async function getProductBySlug(slug) {
  try {
    const q = query(collection(db, PRODUCTS), where('slug','==', slug), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch {}
  const local = await (await fetch('data/sample-products.json')).json();
  return local.find(x => x.slug === slug) || null;
}

export async function getProductById(id){
  const ref = doc(db, PRODUCTS, id);
  const d = await getDoc(ref);
  if (d.exists()) return { id: d.id, ...d.data() };
  return null;
}

export async function listProducts({ category, subcategory, tags = [], search = '', minPrice = 0, maxPrice = Infinity, sort = 'newest', limitNum = 1000 } = {}) {
  let items = [];
  try {
    // Try category filter in query, other filters client-side
    let qref = collection(db, PRODUCTS);
    const constraints = [];
    if (category) constraints.push(where('category','==', category));
    if (typeof minPrice === 'number' && isFinite(minPrice)) constraints.push(where('price','>=', minPrice));
    if (typeof maxPrice === 'number' && isFinite(maxPrice) && maxPrice !== Infinity) constraints.push(where('price','<=', maxPrice));
    if (sort === 'newest') constraints.push(orderBy('createdAt','desc'));
    qref = constraints.length ? query(qref, ...constraints) : qref;
    const snap = await getDocs(qref);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    items = await (await fetch('data/sample-products.json')).json();
  }
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

export async function fetchAllSlugs() {
  try {
    const snap = await getDocs(collection(db, PRODUCTS));
    return snap.docs.map(d => d.data().slug).filter(Boolean);
  } catch { return []; }
}

export async function getAllTags(limitN = 1000) {
  const products = await listProducts({ limitNum: limitN });
  const set = new Set();
  products.forEach(p => (p.tags||[]).forEach(t => set.add(t)));
  return Array.from(set).sort();
}

// Articles
export async function createArticle(input) {
  const now = new Date().toISOString();
  const payload = {
    title: input.title||'',
    slug: input.slug || slugify(input.title||'article'),
    excerpt: input.excerpt||'',
    body: input.body||'',
    image: input.image||'',
    author: input.author||'ByteClave Team',
    publishedAt: input.publishedAt || now,
    externalUrl: input.externalUrl||null
  };
  const ref = await addDoc(collection(db, ARTICLES), payload);
  return { id: ref.id, ...payload };
}

export async function updateArticle(id, updates){
  const ref = doc(db, ARTICLES, id);
  await updateDoc(ref, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteArticle(id){
  const ref = doc(db, ARTICLES, id);
  await deleteDoc(ref);
}

export async function listArticles({ limitNum = 50 } = {}) {
  try {
    const qref = query(collection(db, ARTICLES), orderBy('publishedAt','desc'), limit(limitNum));
    const snap = await getDocs(qref);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return await (await fetch('data/sample-articles.json')).json();
  }
}

export async function getArticleBySlug(slug) {
  try {
    const qref = query(collection(db, ARTICLES), where('slug','==', slug), limit(1));
    const snap = await getDocs(qref);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch {}
  const local = await (await fetch('data/sample-articles.json')).json();
  return local.find(x => x.slug === slug) || null;
}

// RSS settings
export async function getRSSFeeds() {
  try {
    const docRef = doc(db, SETTINGS, 'rss');
    const s = await getDoc(docRef);
    if (s.exists()) return s.data().feeds || [];
  } catch {}
  return [
    'https://news.google.com/rss/search?q=AI+technology&hl=en-US&gl=US&ceid=US:en'
  ];
}
export async function setRSSFeeds(feeds) {
  const ref = doc(db, SETTINGS, 'rss');
  await setDoc(ref, { feeds, updatedAt: serverTimestamp() }, { merge: true });
}
