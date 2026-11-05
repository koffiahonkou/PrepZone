import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '@/src/lib/firebase';

let isStorageAvailable: boolean | null = null;

/**
 * Uploads a Data URL (base64 string) to Firebase Storage and returns its public HTTPS URL.
 * Automatically times out after 1.5s to prevent hanging if Firebase Storage is unprovisioned.
 */
export async function uploadDataUrlToStorage(
  dataUrl: string,
  folder: string = 'attachments',
  fileNameHint: string = 'file'
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  if (isStorageAvailable === false) {
    return dataUrl;
  }

  try {
    const cleanName = fileNameHint.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, path);
    const uploadPromise = uploadString(storageRef, dataUrl, 'data_url');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout')), 1500)
    );
    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    isStorageAvailable = true;
    return downloadUrl;
  } catch (err) {
    isStorageAvailable = false;
    console.warn('Firebase Storage upload unavailable or timed out. Falling back to local payload:', err);
    return dataUrl;
  }
}

/**
 * Reads any File or Blob into a Base64 Data URL.
 * Works uniformly in every browser for all MIME types and file extensions.
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read "${(file as File).name || 'file'}"`));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a file with automatic image compression and fallback.
 * Produces URLs that work globally across all deployments (AI Studio and Vercel).
 * Supports ALL file formats (PDF, Word, Excel, PowerPoint, CSV, Audio, Video, Archives, Images, Text).
 */
export async function uploadAssetFile(
  file: File,
  folder: string = 'branding'
): Promise<string> {
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif|bmp|heic|ico)$/i.test(file.name);
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name);

  // 1. For standard raster images (PNG, JPEG, WEBP), compress directly in browser canvas for fast loading (<60KB)
  if (isImage && !isSvg && !isGif) {
    try {
      const compressed = await compressImageToDataUrl(file, 800, 0.85);
      return compressed;
    } catch (e) {
      console.warn('Image canvas compression failed, continuing with direct file:', e);
    }
  }

  // 2. If storage is known to be unavailable, don't waste time calling Firebase Storage
  if (isStorageAvailable === false) {
    return readFileAsDataUrl(file);
  }

  // 3. Try Firebase Storage with a strict 1.2s timeout race
  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, path);
    const uploadPromise = uploadBytes(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    }).then((snap) => getDownloadURL(snap.ref));

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage upload timeout')), 1200)
    );

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    isStorageAvailable = true;
    return downloadUrl;
  } catch (storageError) {
    isStorageAvailable = false;
    console.warn('Firebase Storage direct upload unavailable or timed out, generating persistent Data URL:', storageError);
    return readFileAsDataUrl(file);
  }
}

/**
 * Compresses an image file in browser canvas to prevent excessive payload size.
 */
export function compressImageToDataUrl(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG, preserve vector code directly
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(img.src);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mime, quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      // Fallback to raw data url
      const rawReader = new FileReader();
      rawReader.onload = () => resolve(rawReader.result as string);
      rawReader.onerror = reject;
      rawReader.readAsDataURL(file);
    };

    reader.readAsDataURL(file);
  });
}
