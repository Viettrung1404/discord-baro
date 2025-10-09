import { deleteFile, listFiles, getFileInfo } from './client';

interface RateLimitConfig {
  maxUploads: number;
  windowMs: number;
  maxSizePerWindow: number;
}

interface UserUploadStats {
  uploads: { timestamp: number; size: number }[];
  totalSize: number;
}

// In-memory rate limiting (in production, use Redis)
const uploadStats = new Map<string, UserUploadStats>();

export const checkRateLimit = (
  userId: string,
  fileSize: number,
  config: RateLimitConfig = {
    maxUploads: 10,
    windowMs: 60 * 1000, // 1 minute
    maxSizePerWindow: 50 * 1024 * 1024 // 50MB
  }
): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create user stats
  const userStats = uploadStats.get(userId) || { uploads: [], totalSize: 0 };

  // Clean old uploads
  userStats.uploads = userStats.uploads.filter(upload => upload.timestamp > windowStart);
  userStats.totalSize = userStats.uploads.reduce((total, upload) => total + upload.size, 0);

  // Check upload count limit
  if (userStats.uploads.length >= config.maxUploads) {
    return {
      allowed: false,
      error: `Too many uploads. Maximum ${config.maxUploads} uploads per minute.`
    };
  }

  // Check size limit
  if (userStats.totalSize + fileSize > config.maxSizePerWindow) {
    return {
      allowed: false,
      error: `Upload size limit exceeded. Maximum ${(config.maxSizePerWindow / 1024 / 1024).toFixed(1)}MB per minute.`
    };
  }

  // Add current upload
  userStats.uploads.push({ timestamp: now, size: fileSize });
  userStats.totalSize += fileSize;
  uploadStats.set(userId, userStats);

  return { allowed: true };
};

// File type detection
export const detectFileType = (buffer: Buffer): { mimeType: string; extension: string } => {
  // Check magic numbers
  if (buffer.length < 4) {
    return { mimeType: 'application/octet-stream', extension: 'bin' };
  }

  const header = buffer.slice(0, 8);
  
  // Images
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (header.slice(0, 6).toString() === 'GIF87a' || header.slice(0, 6).toString() === 'GIF89a') {
    return { mimeType: 'image/gif', extension: 'gif' };
  }
  if (header.slice(0, 4).toString() === 'RIFF' && header.slice(8, 12).toString() === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  // Documents
  if (header.slice(0, 4).toString('hex') === '25504446') { // %PDF
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }
  if (header[0] === 0x50 && header[1] === 0x4B) { // ZIP-based files
    return { mimeType: 'application/zip', extension: 'zip' };
  }

  // Videos
  if (header.slice(4, 8).toString() === 'ftyp') {
    return { mimeType: 'video/mp4', extension: 'mp4' };
  }

  return { mimeType: 'application/octet-stream', extension: 'bin' };
};

// Generate secure filename
export const generateSecureFileName = (
  originalName: string,
  userId: string,
  customPrefix?: string
): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 50);

  const prefix = customPrefix || 'file';
  return `${userId}/${prefix}/${timestamp}-${random}-${safeName}.${extension}`;
};

// File cleanup utilities
export const scheduleFileCleanup = (fileName: string, delayMs: number): void => {
  setTimeout(async () => {
    try {
      await deleteFile(fileName);
      console.log(`Cleaned up temporary file: ${fileName}`);
    } catch (error) {
      console.error(`Failed to cleanup file ${fileName}:`, error);
    }
  }, delayMs);
};

export const cleanupUserFiles = async (
  userId: string,
  olderThanDays: number = 30
): Promise<{ deleted: number; errors: string[] }> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const files = await listFiles('discord-files', `${userId}/`);
    const errors: string[] = [];
    let deleted = 0;

    for (const fileName of files) {
      try {
        const info = await getFileInfo(fileName);
        if (info.lastModified < cutoffDate) {
          await deleteFile(fileName);
          deleted++;
        }
      } catch (error) {
        errors.push(`Failed to process ${fileName}: ${error}`);
      }
    }

    return { deleted, errors };
  } catch (error) {
    return { deleted: 0, errors: [`Cleanup failed: ${error}`] };
  }
};
