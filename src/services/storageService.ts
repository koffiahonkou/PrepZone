import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/src/lib/firebase';

/**
 * Upload a file to Firebase Storage with automatic fallback to optimized base64 Data URL.
 * Produces URLs that work globally across all deployments (AI Studio and Vercel).
 */
export async function uploadAssetFile(
  file: File,
  folder: string = 'branding'
): Promise<string> {
  const isImage = file.type.startsWith('image/');

  // For image files, try Firebase Storage first
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
