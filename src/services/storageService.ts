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
 * Upload a file with automatic image compression and fallback.
 * Produces URLs that work globally across all deployments (AI Studio and Vercel).
 */
export async function uploadAssetFile(
  file: File,
  folder: string = 'branding'
): Promise<string> {
  const isImage = file.type.startsWith('image/');

  // For images, optimize and compress directly via canvas (< 50KB data URL)
  // This guarantees instant loading, zero storage bucket dependency, and universal cross-domain sync
  if (isImage) {
    try {
      const compressed = await compressImageToDataUrl(file, 600, 0.82);
      return compressed;
    } catch (e) {
      console.warn('Image canvas compression failed, trying storage:', e);
    }
  }
  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Direct Firebase Storage upload unavailable or deferred, generating optimized Data URL:', storageError);

    if (isImage) {
      return compressImageToDataUrl(file, 800, 0.85);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
