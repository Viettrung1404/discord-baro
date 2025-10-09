"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  size: number;
  type: string;
}

export const FileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadedFiles(prev => [...prev, result]);
      
      // Reset input
      event.target.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const response = await fetch(`/api/upload?fileName=${fileName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setUploadedFiles(prev => prev.filter(file => file.fileName !== fileName));
      
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    }
  };

  const loadUserFiles = async () => {
    try {
      const response = await fetch('/api/upload?action=list');
      
      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const result = await response.json();
      console.log('User files:', result.files);
      
    } catch (error) {
      console.error('Load files error:', error);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded">
      <h3 className="text-lg font-semibold">MinIO File Upload Demo</h3>
      
      <div className="flex items-center space-x-2">
        <Input
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          accept="image/*,application/pdf,.txt,.doc,.docx"
        />
        <Button 
          onClick={loadUserFiles}
          variant="outline"
        >
          Load Files
        </Button>
      </div>

      {uploading && (
        <div className="text-blue-600">Uploading...</div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploaded Files:</h4>
          {uploadedFiles.map((file, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex-1">
                <div className="font-medium">{file.fileName.split('/').pop()}</div>
                <div className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB • {file.type}
                </div>
                <a 
                  href={file.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View File
                </a>
              </div>
              <Button
                onClick={() => handleDelete(file.fileName)}
                variant="destructive"
                size="sm"
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
