// storage.js - Firebase Storage uploads with client-side image compression
import { storage } from './firebase.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

export function detectFormatFromName(name=''){
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'PDF';
  if (n.endsWith('.apk')) return 'APK';
  if (n.endsWith('.zip')) return 'ZIP';
  if (n.endsWith('.vsix')) return 'VSIX';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'JPG';
  if (n.endsWith('.png')) return 'PNG';
  return '';
}

export async function compressImageIfNeeded(file, maxWidth = 1600, quality = 0.82){
  if (!file || !file.type?.startsWith('image/')) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bmp.width);
    const targetW = Math.round(bmp.width * scale);
    const targetH = Math.round(bmp.height * scale);
    let blob;
    if (typeof OffscreenCanvas !== 'undefined'){
      const canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bmp, 0, 0, targetW, targetH);
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(await bitmapToImage(bmp), 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      blob = dataURLToBlob(dataUrl);
    }
    return new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i,'.jpg'), { type: 'image/jpeg' });
  } catch { return file; }
}

function dataURLToBlob(dataURL){
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length; const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

async function bitmapToImage(bitmap){
  return await new Promise((resolve)=>{
    const img = new Image();
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    img.onload = ()=> resolve(img);
    img.src = canvas.toDataURL();
  });
}

export async function uploadFile(file, pathPrefix='uploads/'){
  const toUpload = await compressImageIfNeeded(file);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name}`;
  const storageRef = ref(storage, `${pathPrefix}${id}`);
  await new Promise((resolve, reject)=>{
    const task = uploadBytesResumable(storageRef, toUpload);
    task.on('state_changed', ()=>{}, reject, resolve);
  });
  const url = await getDownloadURL(storageRef);
  return url;
}

// Same as uploadFile but allows a progress callback (0-100)
export async function uploadFileWithProgress(file, pathPrefix='uploads/', onProgress){
  const toUpload = await compressImageIfNeeded(file);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name}`;
  const storageRef = ref(storage, `${pathPrefix}${id}`);
  await new Promise((resolve, reject)=>{
    const task = uploadBytesResumable(storageRef, toUpload);
    task.on('state_changed', (snap)=>{
      if (onProgress && snap.total) onProgress(Math.round((snap.bytesTransferred / snap.total) * 100));
    }, reject, resolve);
  });
  const url = await getDownloadURL(storageRef);
  return url;
}
