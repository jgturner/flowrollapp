'use client';

import React, { useState, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export function UploadVideoModal({ open, onOpenChange, onUploadSuccess }: UploadVideoModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', 'Draft Video');
      formData.append('position', 'Standing');
      formData.append('user_id', user.id);

      // Wait for the immediate response to get the technique ID
      console.log('🎬 Starting upload...');
      const response = await fetch('/api/mux/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🎬 Upload started successfully:', result);

        // Immediately close modal and notify parent
        console.log('🎬 Upload started, closing modal...');
        setIsUploading(false);
        setVideoFile(null);
        setUploadProgress(0);
        onOpenChange(false);

        // Notify parent component that upload was successful
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        const errorText = await response.text();
        console.error('🎬 Upload failed:', response.status, errorText);
        setIsUploading(false);
        setError('Failed to start upload. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setError('Failed to start upload. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setVideoFile(null);
      setError(null);
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Video
          </DialogTitle>
          <DialogDescription>Choose a video file to upload. Supported formats: MP4, MOV, AVI (max 100MB)</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{videoFile ? videoFile.name : 'Select video file'}</h3>
            <p className="text-muted-foreground mb-4">
              {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Click to browse or drag and drop your video file here'}
            </p>
            <Button variant="outline" disabled={isUploading}>
              {videoFile ? 'Change File' : 'Browse Files'}
            </Button>
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" disabled={isUploading} />

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Starting upload...</span>
              </div>
              <Progress value={25} />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isUploading} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!videoFile || isUploading} className="flex-1">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Video
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
