import React, { useState, useRef } from 'react';
import { api, type Document } from '@/lib/api';

export interface DocumentUploadProps {
  userId: string;
  onUploadComplete?: (count: number) => void;
  onError?: (error: string) => void;
}

export function DocumentUpload({ userId, onUploadComplete, onError }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const documents: Document[] = [];

      // Process files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        documents.push({ text });

        setProgress(Math.round(((i + 1) / files.length) * 50));
      }

      // Upload to API
      const result = await api.uploadDocuments(documents);
      setProgress(100);

      if (result.errors && result.errors.length > 0) {
        onError?.(`${result.inserted} documents uploaded, ${result.errors.length} failed: ${result.errors.join(', ')}`);
      } else {
        onUploadComplete?.(result.inserted);
        setFiles([]);
      }
    } catch (err: any) {
      onError?.(err.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2"
      >
        📄 Upload Documents
      </button>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Upload Documents</h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary transition-colors"
          >
            <div className="text-center">
              <span className="text-3xl mb-2">📁</span>
              <p className="text-sm text-muted-foreground">
                Click to select files or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .txt, .md, .json (max 100KB each)
              </p>
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-muted-foreground mr-2">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Uploading... {progress}%
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={() => setFiles([])}
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
