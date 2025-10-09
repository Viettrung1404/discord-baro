"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Image, X } from 'lucide-react';

interface ServerImageUploadProps {
  value?: string;
  onChange?: (url?: string) => void;
  disabled?: boolean;
}

export const ServerImageUpload = ({
  value,
  onChange,
  disabled = false
}: ServerImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max for server icons)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'serverIcon');
      formData.append('generateThumbnail', 'true');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      const imageUrl = result.fileUrl;
      
      setPreview(imageUrl);
      onChange?.(imageUrl);

      // Reset input
      event.target.value = '';

    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange?.(undefined);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {preview ? (
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
            <img
              src={preview}
              alt="Server icon"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
          <Image className="h-8 w-8 text-gray-400" />
        </div>
      )}

      <div className="flex flex-col items-center space-y-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={disabled || uploading}
          className="hidden"
          id="server-image-upload"
        />
        <label htmlFor="server-image-upload">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            asChild
          >
            <span className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Icon'}
            </span>
          </Button>
        </label>
        
        <p className="text-xs text-gray-500 text-center">
          PNG, JPG, GIF up to 10MB<br />
          Recommended: 256x256px
        </p>
      </div>
    </div>
  );
};
