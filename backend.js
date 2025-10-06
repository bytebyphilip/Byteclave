// backend.js - ByteClave local backend (replaces Firestore fully if desired)
// This module wraps localdb and provides the API used by the app/admin.

import { localCreate, localUpdate, localDelete, localGet, localList } from './localdb.js';
import { slugify, ensureUniqueSlug, DEFAULT_TAXONOMY } from './app.js';

export const Backend = {
  async listCategories(){
    const cats = await localList('categories');
    if (!cats.length) {
      for (const c of DEFAULT_TAXONOMY){ await localCreate('categories', { id: c.name, ...c }); }
      return await localList('categories');
    }
    return cats;
  },
  async upsertCategory(cat){ return await localCreate('categories', { id: cat.name, ...cat }); },
  async deleteCategory(name){ return await localDelete('categories', name); },

  async listProducts(filter={}){
    const items = await localList('products');
    let out = items.filter(p=>!p.deleted && p.published!==false);
    if (filter.category) out = out.filter(p=>p.category===filter.category);
    if (filter.subcategory) out = out.filter(p=>p.subcategory===filter.subcategory);
    return out;
  },
  async getProductById(id){ return await localGet('products', id); },
  async createProduct(input){
    const now = new Date().toISOString();
    const slug = ensureUniqueSlug(slugify(input.slug||input.title), (await localList('products')).map(p=>p.slug));
    const doc = { ...input, id: 'p_'+Math.random().toString(36).slice(2,9), slug, createdAt: now, updatedAt: now, deleted: false, published: !!input.published };
    return await localCreate('products', doc);
  },
  async updateProduct(id, updates){ return await localUpdate('products', id, { ...updates, updatedAt: new Date().toISOString() }); },
  async softDeleteProduct(id){ return await localUpdate('products', id, { deleted: true }); },
  async hardDeleteProduct(id){ return await localDelete('products', id); },

  async listArticles(){ return await localList('articles'); },
  async createArticle(doc){ return await localCreate('articles', { id: 'a_'+Math.random().toString(36).slice(2,9), ...doc }); },
};
