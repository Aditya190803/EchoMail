/**
 * Image Optimization Utilities
 *
 * Provides client-side image compression, resizing, and format conversion
 * for email attachments before upload.
 */

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Quality (0-1 for JPEG/WebP) */
  quality?: number;
  /** Output format */
  format?: "jpeg" | "png" | "webp";
  /** Maximum file size in bytes */
  maxFileSize?: number;
}

/**
 * Optimized image result
 */
export interface OptimizedImage {
  /** Base64 data URL */
  dataUrl: string;
  /** Blob for upload */
  blob: Blob;
  /** Original file name */
  originalName: string;
  /** New file name with extension */
  newName: string;
  /** Original size in bytes */
  originalSize: number;
  /** New size in bytes */
  newSize: number;
  /** Compression ratio (0-1) */
  compressionRatio: number;
  /** Image dimensions */
  dimensions: { width: number; height: number };
}

/**
 * Default optimization settings
 */
const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: "jpeg",
  maxFileSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Optimize an image file
 * @param file Image file to optimize
 * @param options Optimization options
 * @returns Optimized image data
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {},
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Load image
  const img = await loadImage(file);

  // Calculate new dimensions
  const dimensions = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight,
  );

  // Create canvas and draw resized image
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Use high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

  // Convert to desired format
  const mimeType = getMimeType(opts.format);
  let quality = opts.quality;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  // Reduce quality if file is too large
  while (blob.size > opts.maxFileSize && quality > 0.1) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  const dataUrl = canvas.toDataURL(mimeType, quality);
  const extension = opts.format === "jpeg" ? "jpg" : opts.format;
  const newName = file.name.replace(/\.[^.]+$/, `.${extension}`);

  return {
    dataUrl,
    blob,
    originalName: file.name,
    newName,
    originalSize: file.size,
    newSize: blob.size,
    compressionRatio: blob.size / file.size,
    dimensions,
  };
}

/**
 * Batch optimize multiple images
 * @param files Array of image files
 * @param options Optimization options
 * @param onProgress Progress callback
 * @returns Array of optimized images
 */
export async function batchOptimizeImages(
  files: File[],
  options: ImageOptimizationOptions = {},
  onProgress?: (current: number, total: number) => void,
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const optimized = await optimizeImage(files[i], options);
    results.push(optimized);
    onProgress?.(i + 1, files.length);
  }

  return results;
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return { width: img.width, height: img.height };
}

/**
 * Create thumbnail from image
 */
export async function createThumbnail(
  file: File,
  size: number = 150,
): Promise<string> {
  const result = await optimizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: "jpeg",
  });
  return result.dataUrl;
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeType });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper functions

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function getMimeType(format: string): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      mimeType,
      quality,
    );
  });
}
