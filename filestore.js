// filestore.js - Local (IndexedDB-based) file storage helper
// For simplicity we store data URLs directly; suitable for images/thumbnails and small files
import { localCreate, localGet } from './localdb.js';

export async function saveToLocal(file){
  const dataURL = await fileToDataURL(file);
  const id = 'file_' + Math.random().toString(36).slice(2,9);
  await localCreate('files', { id, name: file.name, mime: file.type, size: file.size, dataURL, createdAt: new Date().toISOString() });
  return { id, url: dataURL };
}

export async function getLocalFileUrl(id){
  const rec = await localGet('files', id);
  return rec? rec.dataURL : null;
}

function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = ()=> reject(reader.error);
    reader.readAsDataURL(file);
  });
}
