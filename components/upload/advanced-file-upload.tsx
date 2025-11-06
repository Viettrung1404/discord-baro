"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, Video, FileText, X, Eye, Download } from 'lucide-react';

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  size: number;
  type: string;
  metadata?: any;
}

interface AdvancedFileUploadProps {
  uploadType?: 'avatar' | 'serverIcon' | 'messageAttachment';
  maxFiles?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  className?: string;
}

export const AdvancedFileUpload = ({
  uploadType = 'messageAttachment',
  maxFiles = 5,
  onUploadComplete,
  className = ''
}: AdvancedFileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);
    formData.append('generateThumbnail', file.type.startsWith('image/') ? 'true' : 'false');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const result = await uploadFile(file);
        setUploadProgress(((index + 1) / files.length) * 100);
        return result;
      });

      const results = await Promise.all(uploadPromises);
      const newFiles = results.map(result => ({
        fileName: result.metadata.fileName,
        fileUrl: result.fileUrl,
        thumbnailUrl: result.thumbnailUrl,
        size: result.metadata.size,
        type: result.metadata.contentType,
        metadata: result.metadata
      }));

      setUploadedFiles(prev => [...prev, ...newFiles]);
      onUploadComplete?.(newFiles);

    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const limitedFiles = acceptedFiles.slice(0, maxFiles - uploadedFiles.length);
    handleFileUpload(limitedFiles);
  }, [maxFiles, uploadedFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: maxFiles > 1,
    disabled: uploading || uploadedFiles.length >= maxFiles
  });

  const removeFile = async (fileName: string) => {
    try {
      const response = await fetch(`/api/upload?fileName=${fileName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploadedFiles(prev => prev.filter(file => file.fileName !== fileName));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload - {uploadType}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${uploading ? 'pointer-events-none opacity-50' : ''}
            ${uploadedFiles.length >= maxFiles ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          
          {uploading ? (
            <div className="space-y-2">
              <p className="text-lg font-medium">Uploading...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500">{uploadProgress.toFixed(0)}% complete</p>
            </div>
          ) : uploadedFiles.length >= maxFiles ? (
            <p className="text-lg text-gray-500">Maximum files reached ({maxFiles})</p>
          ) : isDragActive ? (
            <p className="text-lg text-blue-600">Drop files here...</p>
          ) : (
            <div>
              <p className="text-lg font-medium">Drag & drop files here</p>
              <p className="text-gray-500">or click to browse</p>
              <p className="text-sm text-gray-400 mt-2">
                {maxFiles - uploadedFiles.length} files remaining
              </p>
            </div>
          )}
        </div>

        {/* Upload Type Info */}
        <div className="flex gap-2 text-xs text-gray-500">
          <Badge variant="outline">Type: {uploadType}</Badge>
          {uploadType === 'avatar' && <Badge variant="outline">Max: 5MB, Images only</Badge>}
          {uploadType === 'serverIcon' && <Badge variant="outline">Max: 10MB, Images/GIF</Badge>}
          {uploadType === 'messageAttachment' && <Badge variant="outline">Max: 50MB, Various types</Badge>}
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
            {uploadedFiles.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {file.fileName.split('/').pop()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {file.type}
                    </div>
                    {file.metadata?.width && file.metadata?.height && (
                      <div className="text-xs text-gray-400">
                        {file.metadata.width}×{file.metadata.height}
                      </div>
                    )}
                  </div>
                  {file.thumbnailUrl && (
                    <img 
                      src={file.thumbnailUrl} 
                      alt="Thumbnail" 
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.fileUrl, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = file.fileUrl;
                      a.download = file.fileName.split('/').pop() || 'download';
                      a.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.fileName)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
