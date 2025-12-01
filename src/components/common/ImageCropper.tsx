import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Slider,
  Typography,
  IconButton,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Close,
} from '@mui/icons-material';

interface ImageCropperProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedImage: Blob) => void;
  aspectRatio?: number;
}

export default function ImageCropper({
  open,
  imageUrl,
  onClose,
  onSave,
  aspectRatio = 1, // Default to square (1:1)
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image when dialog opens
  useEffect(() => {
    if (open && imageUrl) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);

        // Calculate initial scale to fit the image properly
        const canvas = canvasRef.current;
        if (canvas) {
          const cropSize = Math.min(canvas.width, canvas.height) * 0.8;
          const scaleX = cropSize / img.width;
          const scaleY = cropSize / img.height;
          const initialScale = Math.max(scaleX, scaleY);

          setScale(initialScale);
        } else {
          setScale(1);
        }

        // Center the image initially
        setPosition({ x: 0, y: 0 });
      };
      img.src = imageUrl;
    } else {
      setImageLoaded(false);
    }
  }, [open, imageUrl]);

  // Draw image on canvas
  const drawImage = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate scaled dimensions
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Center and apply position offset
    const x = (canvasWidth - scaledWidth) / 2 + position.x;
    const y = (canvasHeight - scaledHeight) / 2 + position.y;

    // Draw the image
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw crop area overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // Calculate crop area (centered circle or square)
    const cropSize = Math.min(canvasWidth, canvasHeight) * 0.8;
    const cropX = (canvasWidth - cropSize) / 2;
    const cropY = (canvasHeight - cropSize) / 2;

    // Draw overlay outside crop area
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.globalCompositeOperation = 'destination-out';

    if (aspectRatio === 1) {
      // Circular crop for profile images
      ctx.beginPath();
      ctx.arc(canvasWidth / 2, canvasHeight / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rectangular crop
      ctx.fillRect(cropX, cropY, cropSize, cropSize / aspectRatio);
    }

    ctx.restore();

    // Draw crop area border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    if (aspectRatio === 1) {
      ctx.beginPath();
      ctx.arc(canvasWidth / 2, canvasHeight / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cropX, cropY, cropSize, cropSize / aspectRatio);
    }
  }, [scale, position, imageLoaded, aspectRatio]);

  // Redraw when scale or position changes
  useEffect(() => {
    drawImage();
  }, [drawImage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (_event: Event, newValue: number | number[]) => {
    setScale(newValue as number);
  };

  const getCroppedImage = async (): Promise<Blob | null> => {
    if (!canvasRef.current || !imageRef.current) return null;

    const canvas = canvasRef.current;
    const img = imageRef.current;

    // Create a temporary canvas for the cropped result
    const cropCanvas = document.createElement('canvas');
    const cropSize = Math.min(canvas.width, canvas.height) * 0.8;
    cropCanvas.width = 400; // Output size
    cropCanvas.height = 400;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    // Calculate source coordinates
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (canvas.width - scaledWidth) / 2 + position.x;
    const y = (canvas.height - scaledHeight) / 2 + position.y;

    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;

    // Calculate which part of the scaled image to crop
    const sourceX = (cropX - x) / scale;
    const sourceY = (cropY - y) / scale;
    const sourceSize = cropSize / scale;

    // Draw the cropped portion
    cropCtx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    return new Promise((resolve) => {
      cropCanvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    const croppedBlob = await getCroppedImage();
    if (croppedBlob) {
      onSave(croppedBlob);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Adjust Your Photo
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Drag to reposition and use the slider to zoom
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 3,
            bgcolor: 'grey.900',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            style={{
              maxWidth: '100%',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </Box>

        <Box sx={{ px: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <ZoomOut color="action" />
            <Slider
              value={scale}
              onChange={handleZoomChange}
              min={0.5}
              max={3}
              step={0.1}
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
            <ZoomIn color="action" />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!imageLoaded}
        >
          Save Photo
        </Button>
      </DialogActions>
    </Dialog>
  );
}