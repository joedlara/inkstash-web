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

  // Generate unique file path with itemId
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const filePath = `listings/${userId}/${itemId}/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('user-uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
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
