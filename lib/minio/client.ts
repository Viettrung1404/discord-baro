import { Client } from 'minio';
import { validateFile, processImage, scanFile, FileValidationConfig, ProcessedFile } from './file-processing';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT?.split(':')[0] || 'localhost',
  port: parseInt(process.env.MINIO_ENDPOINT?.split(':')[1] || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

// Advanced upload with validation, processing, and metadata
export const uploadFileAdvanced = async (
  file: Buffer | File,
  fileName: string,
  options: {
    bucketName?: string;
    validation?: FileValidationConfig;
    processImage?: boolean;
    imageOptions?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    };
    virusScan?: boolean;
    generateThumbnail?: boolean;
    metadata?: Record<string, string>;
  } = {}
): Promise<{
  success: boolean;
  fileUrl?: string;
  thumbnailUrl?: string;
  metadata?: any;
  error?: string;
}> => {
  try {
    const {
      bucketName = process.env.MINIO_BUCKET_NAME || 'discord-files',
      validation,
      processImage: shouldProcessImage = false,
      imageOptions = {},
      virusScan = true,
      generateThumbnail = false,
      metadata = {}
    } = options;

    let buffer: Buffer;
    let originalFileName: string;
    let contentType: string;
    let fileSize: number;

    // Handle File vs Buffer input
    if (file instanceof File) {
      // Validate file if config provided
      if (validation) {
        const validationResult = validateFile(file, validation);
        if (!validationResult.isValid) {
          return { success: false, error: validationResult.error };
        }
      }

      buffer = Buffer.from(await file.arrayBuffer());
      originalFileName = file.name;
      contentType = file.type;
      fileSize = file.size;
    } else {
      buffer = file;
      originalFileName = fileName;
      contentType = 'application/octet-stream';
      fileSize = buffer.length;
    }

    // Virus scan
    if (virusScan) {
      const scanResult = await scanFile(buffer);
      if (!scanResult.isClean) {
        return { success: false, error: `Security threat detected: ${scanResult.threat}` };
      }
    }

    let finalBuffer = buffer;
    let finalFileName = fileName;
    let processedMetadata: any = {};

    // Process image if requested
    if (shouldProcessImage && contentType.startsWith('image/')) {
      const processed = await processImage(buffer, imageOptions);
      finalBuffer = processed.buffer;
      finalFileName = processed.fileName;
      contentType = processed.contentType;
      processedMetadata = processed.metadata;
    }

    // Upload main file
    await ensureBucketExists(bucketName);
    
    // Sanitize metadata values - encode to base64 for safety
    const sanitizeMetadataValue = (value: string): string => {
      // Remove or encode special characters that are not allowed in HTTP headers
      // Use base64 encoding for non-ASCII characters
      try {
        return Buffer.from(value).toString('base64');
      } catch {
        return value.replace(/[^\x20-\x7E]/g, ''); // Remove non-ASCII chars as fallback
      }
    };

    const uploadMetadata = {
      'Content-Type': contentType,
      'Original-Name': sanitizeMetadataValue(originalFileName),
      'Upload-Time': new Date().toISOString(),
      'File-Size': fileSize.toString(),
      ...Object.fromEntries(
        Object.entries(metadata).map(([key, value]) => [key, sanitizeMetadataValue(value)])
      ),
      ...processedMetadata
    };

    await minioClient.putObject(bucketName, finalFileName, finalBuffer, finalBuffer.length, uploadMetadata);

    const fileUrl = getFileUrl(finalFileName);
    let thumbnailUrl: string | undefined;

    // Generate thumbnail if requested
    if (generateThumbnail && contentType.startsWith('image/')) {
      const thumbnail = await processImage(buffer, {
        maxWidth: 200,
        maxHeight: 200,
        crop: true,
        format: 'webp',
        quality: 70
      });
      
      const thumbnailFileName = `thumbnails/${finalFileName.split('.')[0]}-thumb.webp`;
      await minioClient.putObject(bucketName, thumbnailFileName, thumbnail.buffer, thumbnail.buffer.length, {
        'Content-Type': 'image/webp',
        'Is-Thumbnail': 'true',
        'Parent-File': finalFileName
      });
      
      thumbnailUrl = getFileUrl(thumbnailFileName);
    }

    return {
      success: true,
      fileUrl,
      thumbnailUrl,
      metadata: {
        fileName: finalFileName,
        originalName: originalFileName,
        size: finalBuffer.length,
        contentType,
        uploadTime: uploadMetadata['Upload-Time'],
        ...processedMetadata
      }
    };

  } catch (error) {
    console.error('Advanced upload error:', error);
    return { success: false, error: 'Upload failed' };
  }
};

// Utility functions
const ensureBucketExists = async (bucketName: string): Promise<void> => {
  const bucketExists = await minioClient.bucketExists(bucketName);
  if (!bucketExists) {
    await minioClient.makeBucket(bucketName);
  }
};

export const uploadFile = async (
  file: Buffer,
  fileName: string,
  bucketName: string = process.env.MINIO_BUCKET_NAME || 'discord-files'
): Promise<string> => {
  try {
    // Check if bucket exists, create if not
    await ensureBucketExists(bucketName);

    // Upload file
    await minioClient.putObject(bucketName, fileName, file);
    
    // Return public URL
    const endpoint = process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT || 'http://localhost:9000/discord-files';
    return `${endpoint}/${fileName}`;
  } catch (error) {
    console.error('MinIO upload error:', error);
    throw new Error('Failed to upload file');
  }
};

export const deleteFile = async (
  fileName: string,
  bucketName: string = process.env.MINIO_BUCKET_NAME || 'discord-files'
): Promise<void> => {
  try {
    await minioClient.removeObject(bucketName, fileName);
  } catch (error) {
    console.error('MinIO delete error:', error);
    throw new Error('Failed to delete file');
  }
};

export const getFileUrl = (fileName: string): string => {
  const endpoint = process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT || 'http://localhost:9000/discord-files';
  return `${endpoint}/${fileName}`;
};

export const listFiles = async (
  bucketName: string = process.env.MINIO_BUCKET_NAME || 'discord-files',
  prefix?: string
): Promise<string[]> => {
  try {
    const fileNames: string[] = [];
    const stream = minioClient.listObjects(bucketName, prefix);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => fileNames.push(obj.name || ''));
      stream.on('error', reject);
      stream.on('end', () => resolve(fileNames));
    });
  } catch (error) {
    console.error('MinIO list error:', error);
    throw new Error('Failed to list files');
  }
};

export const getFileInfo = async (
  fileName: string,
  bucketName: string = process.env.MINIO_BUCKET_NAME || 'discord-files'
) => {
  try {
    const stat = await minioClient.statObject(bucketName, fileName);
    return {
      size: stat.size,
      lastModified: stat.lastModified,
      contentType: stat.metaData?.['content-type'],
      etag: stat.etag
    };
  } catch (error) {
    console.error('MinIO stat error:', error);
    throw new Error('Failed to get file info');
  }
};

export const downloadFile = async (
  fileName: string,
  bucketName: string = process.env.MINIO_BUCKET_NAME || 'discord-files'
): Promise<Buffer> => {
  try {
    const stream = await minioClient.getObject(bucketName, fileName);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  } catch (error) {
    console.error('MinIO download error:', error);
    throw new Error('Failed to download file');
  }
};

export default minioClient;
