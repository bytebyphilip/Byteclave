// localdb.js - IndexedDB fallback backend (no server) for ByteClave
// Provides a minimal CRUD interface mirroring firestore-helpers collections

const DB_NAME = 'byteclave_localdb_v1';
const DB_VERSION = 1;
const STORES = ['products','articles','categories','settings','files'];

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      STORES.forEach(name => { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' }); });
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function getStore(name, mode='readonly'){
  const db = await openDB();
  const tx = db.transaction(name, mode);
  return tx.objectStore(name);
}

function genId(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

export async function localCreate(name, doc){
  const store = await getStore(name, 'readwrite');
  const id = doc.id || genId(name.slice(0,2));
  const payload = { ...doc, id };
  await new Promise((res, rej)=>{ const r = store.put(payload); r.onsuccess = res; r.onerror = ()=> rej(r.error); });
  return payload;
}

export async function localUpdate(name, id, updates){
  const store = await getStore(name, 'readwrite');
  const existing = await localGet(name, id);
  if (!existing) throw new Error('Not found');
  const updated = { ...existing, ...updates };
  await new Promise((res, rej)=>{ const r = store.put(updated); r.onsuccess = res; r.onerror = ()=> rej(r.error); });
  return updated;
}

export async function localDelete(name, id){
  const store = await getStore(name, 'readwrite');
  await new Promise((res, rej)=>{ const r = store.delete(id); r.onsuccess = res; r.onerror = ()=> rej(r.error); });
}

export async function localGet(name, id){
  const store = await getStore(name);
  return await new Promise((res, rej)=>{ const r = store.get(id); r.onsuccess = ()=> res(r.result||null); r.onerror = ()=> rej(r.error); });
}

export async function localList(name){
  const store = await getStore(name);
  return await new Promise((res, rej)=>{ const r = store.getAll(); r.onsuccess = ()=> res(r.result||[]); r.onerror = ()=> rej(r.error); });
}

export async function localQuery(name, predicate){
  const all = await localList(name);
  return all.filter(predicate);
}

export async function localUpsert(name, doc){ return await localCreate(name, doc); }

export async function localSetSettings(key, value){
  const existing = (await localList('settings')).find(x=>x.id===key);
  if (existing) await localUpdate('settings', key, { value }); else await localCreate('settings', { id: key, value });
}
export async function localGetSettings(key){
  const existing = (await localList('settings')).find(x=>x.id===key);
  return existing? existing.value : null;
}
