import { supabase } from '../api/supabase/supabaseClient';

export type UploadedPhoto = {
  url: string; // Can be a preview URL (blob:) or actual uploaded URL
  path?: string; // Only set after upload to S3
  file?: File; // The actual file object (before upload)
  type?: 'video' | 'front' | 'back' | 'corner' | 'defects' | 'details' | 'general';
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export async function uploadListingPhoto(
  file: File,
  userId: string,
  itemId: string,
  photoType?: string
): Promise<UploadedPhoto> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 10MB');
  }

  // Validate file type
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error('File must be an image (JPEG, PNG, GIF, WebP) or video (MP4, MOV, WebM)');
  }

  // Resize images >1MB down to 1600px wide JPEG (~300-500KB). Big iPhone
  // shots used to take 10-20s each to upload over a regular connection,
  // wedging the listing flow. Videos pass through untouched.
  const uploadFile = isImage && file.size > 1024 * 1024
    ? await resizeImage(file, 1600, 0.82)
    : file;

  // Generate unique file path with itemId
  const timestamp = Date.now();
  const fileExtension = isImage && uploadFile !== file ? 'jpg' : (file.name.split('.').pop() ?? 'bin');
  const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const filePath = `listings/${userId}/${itemId}/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('user-uploads')
    .upload(filePath, uploadFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: uploadFile.type || file.type,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('user-uploads')
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    path: filePath,
    type: photoType as any,
  };
}

export async function deleteListingPhoto(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('user-uploads')
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export async function uploadMultiplePhotos(
  files: File[],
  userId: string,
  itemId: string,
  onProgress?: (current: number, total: number) => void
): Promise<UploadedPhoto[]> {
  const uploadedPhotos: UploadedPhoto[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const photo = await uploadListingPhoto(file, userId, itemId);
      uploadedPhotos.push(photo);
      onProgress?.(i + 1, files.length);
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      // Continue with other files even if one fails
    }
  }

  return uploadedPhotos;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'File must be JPEG, PNG, GIF, or WebP format' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  return { valid: true };
}

/**
 * Resize an image File client-side using a canvas. Returns a new File (JPEG)
 * scaled so the longest edge is `maxDim`. Quality is the JPEG quality (0–1).
 * Falls back to the original file if canvas/encoding fails for any reason —
 * the upload will still succeed, just slower.
 */
async function resizeImage(file: File, maxDim: number, quality: number): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    );
    if (!blob) return file;
    // Strip extension off the original name so the .jpg path is correct.
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('[resizeImage] failed, uploading original:', err);
    return file;
  }
}

export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
