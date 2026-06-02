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
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

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

      <Typography
        sx={{
          mb: 2,
          fontFamily: inkstashFonts.mono,
          fontSize: 11,
          color: inkstashColors.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {photos.length} / {maxPhotos} photos
      </Typography>

      {/* Photo Upload Grid — main photo + responsive thumb grid.
          minWidth: 0 prevents the inner grid from forcing horizontal overflow
          when the page gets narrow (the original bug — scrolling right into
          a white void past the page edge). */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 380px) 1fr' },
          gap: { xs: 2, md: 2.5 },
          alignItems: 'start',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left Side - Main Upload Box */}
        <Paper
          component="label"
          onDragEnter={photos.length === 0 ? handleDrag : undefined}
          onDragOver={photos.length === 0 ? handleDrag : (e) => handleDragOver(e, 0)}
          onDragLeave={photos.length === 0 ? handleDrag : undefined}
          onDrop={photos.length === 0 ? handleDrop : (e) => handlePhotoDrop(e, 0)}
          sx={{
            width: '100%',
            height: { xs: 300, md: 380 },
            border: '2px dashed',
            borderColor: dragOverIndex === 0 ? 'success.main' : (dragActive ? inkstashColors.brand : inkstashColors.borderStrong),
            borderRadius: inkstashRadii.lg,
            bgcolor: photos.length === 0 ? inkstashColors.bgElev : 'transparent',
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
              {/* Main badge — brand red so it reads as the canonical primary,
                  not just a generic grey label. */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: inkstashColors.brand,
                  color: '#fff',
                  px: 2,
                  py: 0.6,
                  borderRadius: 999,
                  pointerEvents: 'none',
                  fontFamily: inkstashFonts.mono,
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 10px -2px rgba(161,35,44,0.45)',
                }}
              >
                Main
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
              <ImageIcon sx={{ fontSize: 56, color: inkstashColors.muted2, mb: 1.5 }} />
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 800,
                  fontSize: 18,
                  color: inkstashColors.ink,
                  textTransform: 'uppercase',
                  letterSpacing: '0.005em',
                  textAlign: 'center',
                  px: 2,
                  mb: 0.5,
                }}
              >
                Drag &amp; drop files
              </Typography>
              <Typography sx={{ fontSize: 12, color: inkstashColors.muted, mb: 2 }}>
                or click below
              </Typography>
              <Button
                variant="contained"
                onClick={handleUploadClick}
                sx={{
                  bgcolor: inkstashColors.brand,
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: inkstashFonts.ui,
                  fontWeight: 700,
                  fontSize: 12,
                  borderRadius: inkstashRadii.sm,
                  px: 3,
                  py: 1,
                  '&:hover': { bgcolor: inkstashColors.brandDeep },
                }}
              >
                Upload image
              </Button>
            </>
          )}
        </Paper>

        {/* Right Side - thumb grid. minWidth: 0 + overflow: hidden so the
            inner tiles can never push the page sideways. */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(3, 1fr)',
              sm: 'repeat(4, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: 1.25,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {/* Add Button — branded, matches the empty-tile bg so the grid reads
              as a single surface; brand red border + lift on hover so it's
              clearly the actionable one. */}
          <Paper
            elevation={0}
            sx={{
              aspectRatio: '1',
              border: `1.5px solid ${inkstashColors.borderStrong}`,
              borderRadius: inkstashRadii.md,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: inkstashColors.bgElev,
              cursor: 'pointer',
              transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
              '&:hover': {
                borderColor: inkstashColors.brand,
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px -4px rgba(161, 35, 44, 0.25)',
              },
              '&:active': { transform: 'scale(0.97)' },
            }}
            onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}
          >
            <ImageIcon sx={{ fontSize: 28, color: inkstashColors.brand, mb: 0.5 }} />
            <Typography
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: inkstashColors.brand,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Add
            </Typography>
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

          {/* Empty placeholder slots. Page bg is cream (bgSunken), so empty
              tiles need a darker/intentional fill + visible border to read
              as real targets instead of vanishing into the background. */}
          {Array.from({ length: Math.min(maxPhotos - photos.length - 1, 14) }).map((_, idx) => (
            <Paper
              elevation={0}
              key={`empty-${idx}`}
              sx={{
                aspectRatio: '1',
                border: `1px dashed ${inkstashColors.borderStrong}`,
                borderRadius: inkstashRadii.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: inkstashColors.bgSunken,
                cursor: 'pointer',
                transition: 'border-color 140ms ease, background-color 140ms ease',
                '&:hover': {
                  borderColor: inkstashColors.brand,
                  borderStyle: 'solid',
                  bgcolor: inkstashColors.brandSoft,
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
