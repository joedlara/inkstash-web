import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Image as ImageIcon,
  DragIndicator,
} from '@mui/icons-material';
import { createImagePreview } from '../../utils/photoUpload';
import type { UploadedPhoto } from '../../utils/photoUpload';
import { useAuth } from '../../hooks/useAuth';

interface PhotoUploadSectionProps {
  photos: UploadedPhoto[];
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
}

export default function PhotoUploadSection({
  photos,
  onPhotosChange,
  maxPhotos = 25,
}: PhotoUploadSectionProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleFiles(files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!user?.id) {
      setError('You must be logged in to upload photos');
      return;
    }

    if (photos.length + files.length > maxPhotos) {
      setError(`You can only upload up to ${maxPhotos} photos`);
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    const newPhotos: UploadedPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Create local preview instead of uploading immediately
        const previewUrl = await createImagePreview(file);
        newPhotos.push({
          url: previewUrl,
          file: file, // Store the actual file for later upload
        });
        setUploadProgress({ current: i + 1, total: files.length });
      } catch (err: any) {
        console.error('Error creating preview:', err);
        setError(err.message || 'Failed to process file');
      }
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    onPhotosChange([...photos, ...newPhotos]);
  };

  const handleRemovePhoto = (index: number) => {
    const photoToRemove = photos[index];

    // Revoke the preview URL to free up memory
    if (photoToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.url);
    }

    // Remove from state
    const updatedPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle photo reordering
  const handlePhotoReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newPhotos = [...photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);

    onPhotosChange(newPhotos);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      handlePhotoReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handlePhotoDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      handlePhotoReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {photos.length}/{maxPhotos}
      </Typography>

      {/* Photo Upload Grid - StubHub Style Layout */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto 1fr' }, gap: 2 }}>
        {/* Left Side - Main Upload Box */}
        <Paper
          component="label"
          onDragEnter={photos.length === 0 ? handleDrag : undefined}
          onDragOver={photos.length === 0 ? handleDrag : (e) => handleDragOver(e, 0)}
          onDragLeave={photos.length === 0 ? handleDrag : undefined}
          onDrop={photos.length === 0 ? handleDrop : (e) => handlePhotoDrop(e, 0)}
          sx={{
            width: { xs: '100%', md: 380 },
            height: { xs: 300, md: 380 },
            border: '2px dashed',
            borderColor: dragOverIndex === 0 ? 'success.main' : (dragActive ? 'primary.main' : 'grey.300'),
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            bgcolor: dragOverIndex === 0 ? 'rgba(46, 125, 50, 0.05)' : (dragActive ? 'rgba(0, 120, 255, 0.05)' : 'grey.50'),
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: photos.length > 0 ? 'grey.300' : 'primary.main',
              bgcolor: photos.length > 0 ? 'grey.50' : 'grey.100',
            },
            position: 'relative',
            opacity: draggedIndex === 0 ? 0.5 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,video/*"
            multiple
            onChange={handleFileInput}
          />
          {uploading ? (
            <>
              <CircularProgress size={50} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Uploading {uploadProgress.current} of {uploadProgress.total}
              </Typography>
            </>
          ) : photos.length > 0 ? (
            <>
              {/* Show main photo preview */}
              <Box
                draggable
                onDragStart={(e) => handleDragStart(e, 0)}
                onDragEnd={handleDragEnd}
                sx={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  cursor: 'grab',
                  '&:active': {
                    cursor: 'grabbing',
                  },
                }}
              >
                {photos[0].url.includes('.mp4') || photos[0].url.includes('.mov') || photos[0].url.includes('.webm') ? (
                  <Box
                    component="video"
                    src={photos[0].url}
                    controls
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 2, pointerEvents: 'none' }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={photos[0].url}
                    alt="Main photo"
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 2, pointerEvents: 'none' }}
                  />
                )}
              </Box>
              {/* Main badge at bottom center */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'rgba(100, 100, 100, 0.8)',
                  color: 'white',
                  px: 3,
                  py: 1,
                  borderRadius: 20,
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Main
                </Typography>
              </Box>
              {/* Drag indicator */}
              <Tooltip title="Drag to reorder">
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    borderRadius: 1,
                    px: 0.5,
                    py: 0.5,
                    cursor: 'grab',
                    pointerEvents: 'none',
                  }}
                >
                  <DragIndicator fontSize="small" />
                </Box>
              </Tooltip>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  handleRemovePhoto(0);
                }}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  width: 32,
                  height: 32,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                  },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </>
          ) : (
            <>
              <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" fontWeight={600} textAlign="center" px={2}>
                Drag and drop files
              </Typography>
              <Button
                variant="outlined"
                size="medium"
                onClick={handleUploadClick}
                sx={{ mt: 2, textTransform: 'none', borderRadius: 20, px: 3 }}
              >
                Upload image
              </Button>
            </>
          )}
        </Paper>

        {/* Right Side - All Photos Grid (includes uploaded + category boxes + empty slots) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
          {/* Add Button */}
          <Paper
            component="label"
            sx={{
              aspectRatio: '1',
              border: '1px solid',
              borderColor: 'grey.300',
              borderRadius: 1.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'grey.50',
                borderColor: 'primary.main',
              },
            }}
            onClick={handleUploadClick}
          >
            <input
              type="file"
              hidden
              accept="image/*,video/*"
              multiple
              onChange={handleFileInput}
            />
            <ImageIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 0.5 }} />
            <Typography variant="caption" fontWeight={500}>Add</Typography>
          </Paper>

          {/* Uploaded Photos (starting from index 1, since 0 is main) */}
          {photos.slice(1).map((photo, index) => {
            const actualIndex = index + 1;
            return (
              <Box
                key={actualIndex}
                draggable
                onDragStart={(e) => handleDragStart(e, actualIndex)}
                onDragOver={(e) => handleDragOver(e, actualIndex)}
                onDrop={(e) => handlePhotoDrop(e, actualIndex)}
                onDragEnd={handleDragEnd}
                sx={{
                  aspectRatio: '1',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  position: 'relative',
                  bgcolor: 'grey.100',
                  border: '2px solid',
                  borderColor: dragOverIndex === actualIndex ? 'success.main' : 'grey.300',
                  cursor: 'grab',
                  opacity: draggedIndex === actualIndex ? 0.5 : 1,
                  transition: 'all 0.2s',
                  '&:active': {
                    cursor: 'grabbing',
                  },
                  '&:hover .drag-indicator': {
                    opacity: 1,
                  },
                }}
              >
                {photo.url.includes('.mp4') || photo.url.includes('.mov') || photo.url.includes('.webm') ? (
                  <Box
                    component="video"
                    src={photo.url}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={photo.url}
                    alt={`Upload ${actualIndex + 1}`}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                  />
                )}
                {/* Drag indicator */}
                <Box
                  className="drag-indicator"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    borderRadius: 0.5,
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    pointerEvents: 'none',
                  }}
                >
                  <DragIndicator sx={{ fontSize: 14 }} />
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemovePhoto(actualIndex);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    width: 24,
                    height: 24,
                    p: 0.5,
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                    },
                  }}
                >
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          })}

          {/* Empty placeholder boxes for remaining slots */}
          {Array.from({ length: Math.min(maxPhotos - photos.length - 1, 14) }).map((_, idx) => (
            <Paper
              key={`empty-${idx}`}
              sx={{
                aspectRatio: '1',
                border: '1px solid',
                borderColor: 'grey.200',
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'grey.400',
                  bgcolor: 'grey.100',
                },
              }}
              onClick={handleUploadClick}
            >
              {/* Empty box */}
            </Paper>
          ))}
        </Box>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Tip: The first photo will be your main listing photo. Drag and drop photos to reorder them. You can add more photos or remove existing ones at any time.
        </Typography>
      </Box>
    </Box>
  );
}
