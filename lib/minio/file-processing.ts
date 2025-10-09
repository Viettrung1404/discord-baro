import sharp from 'sharp';

export interface FileValidationConfig {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  maxWidth?: number;
  maxHeight?: number;
}

export interface ProcessedFile {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
  };
}

// File validation
export const validateFile = (
  file: File,
  config: FileValidationConfig
): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > config.maxSize) {
    return {
      isValid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(config.maxSize / 1024 / 1024).toFixed(2)}MB`
    };
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !config.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File extension .${extension} is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`
    };
  }

  return { isValid: true };
};

// Image processing
export const processImage = async (
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    crop?: boolean;
  } = {}
): Promise<ProcessedFile> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = 'jpeg',
    crop = false
  } = options;

  let image = sharp(buffer);
  
  // Get metadata
  const metadata = await image.metadata();
  
  // Resize if needed
  if (metadata.width && metadata.height) {
    if (crop && maxWidth && maxHeight) {
      // Crop to exact dimensions
      image = image.resize(maxWidth, maxHeight, {
        fit: 'cover',
        position: 'center'
      });
    } else if (metadata.width > maxWidth || metadata.height > maxHeight) {
      // Resize maintaining aspect ratio
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
  }

  // Convert format and compress
  if (format === 'jpeg') {
    image = image.jpeg({ quality });
  } else if (format === 'png') {
    image = image.png({ compressionLevel: 9 });
  } else if (format === 'webp') {
    image = image.webp({ quality });
  }

  const processedBuffer = await image.toBuffer();
  const processedMetadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    fileName: `processed-${Date.now()}.${format}`,
    contentType: `image/${format}`,
    size: processedBuffer.length,
    metadata: {
      width: processedMetadata.width,
      height: processedMetadata.height,
      format: processedMetadata.format
    }
  };
};

// Generate multiple sizes for avatars/thumbnails
export const generateImageSizes = async (
  buffer: Buffer,
  sizes: { name: string; width: number; height: number }[]
): Promise<ProcessedFile[]> => {
  const results: ProcessedFile[] = [];

  for (const size of sizes) {
    const processed = await processImage(buffer, {
      maxWidth: size.width,
      maxHeight: size.height,
      crop: true,
      format: 'webp',
      quality: 85
    });

    processed.fileName = `${size.name}-${processed.fileName}`;
    results.push(processed);
  }

  return results;
};

// Virus scanning simulation (you can integrate real virus scanner)
export const scanFile = async (buffer: Buffer): Promise<{ isClean: boolean; threat?: string }> => {
  // Simulate virus scanning
  const suspiciousPatterns = [
    Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'),
    Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'),
  ];

  for (const pattern of suspiciousPatterns) {
    if (buffer.includes(pattern)) {
      return {
        isClean: false,
        threat: 'Test virus detected'
      };
    }
  }

  // Check file size for zip bombs
  if (buffer.length > 100 * 1024 * 1024) { // 100MB
    return {
      isClean: false,
      threat: 'File too large - potential zip bomb'
    };
  }

  return { isClean: true };
};
