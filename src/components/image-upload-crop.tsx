'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Crop as CropIcon } from 'lucide-react';

interface ImageUploadCropProps {
  onImageSelect: (croppedImageUrl: string | null) => void;
  currentImageUrl?: string;
  className?: string;
}

export function ImageUploadCrop({ onImageSelect, currentImageUrl, className = '' }: ImageUploadCropProps) {
  const [imgSrc, setImgSrc] = useState<string>(currentImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update imgSrc when currentImageUrl changes
  useEffect(() => {
    setImgSrc(currentImageUrl || '');
  }, [currentImageUrl]);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result?.toString() || '';
        setImgSrc(result);
        onImageSelect(result);
      });
      reader.addEventListener('error', (error) => {
        console.error('FileReader error:', error);
        onImageSelect(null);
      });
      reader.readAsDataURL(file);
    }
  }

  const handleRemoveImage = () => {
    setImgSrc('');
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Input ref={fileInputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" />

      {!imgSrc && (
        <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <Label htmlFor="image-upload" className="cursor-pointer">
              <span className="text-sm text-gray-600 mb-2 block">Click to upload profile image</span>
              <Button type="button" variant="outline" onClick={handleChangeImage}>
                Choose Image
              </Button>
            </Label>
          </CardContent>
        </Card>
      )}

      {imgSrc && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img src={imgSrc} alt="Profile preview" className="w-full h-48 object-cover rounded" />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={handleChangeImage}>
                  <CropIcon className="h-4 w-4 mr-1" />
                  Change
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={handleRemoveImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
