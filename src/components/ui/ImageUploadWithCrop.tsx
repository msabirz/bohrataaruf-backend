'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { getCroppedImageFile } from '@/lib/cropImage';

/**
 * Self-contained upload trigger + preview + crop modal. Camera capture is
 * deliberately not included here — a real "take a photo" experience needs
 * a custom getUserMedia component to work consistently on desktop, not
 * just the mobile-only <input capture> attribute; that's a separate,
 * larger piece of work, held for later.
 */
export function ImageUploadWithCrop({
  onImageReady,
  aspect,
  triggerLabel = 'Click to upload photo',
  fileName = 'upload.jpg',
  className = '',
  disabled = false,
}: {
  onImageReady: (file: File) => void;
  aspect?: number; // undefined = free-form crop
  triggerLabel?: string;
  fileName?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCropping(true);
  };

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const confirmCrop = async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const file = await getCroppedImageFile(rawImageSrc, croppedAreaPixels, fileName);
      setCroppedPreview(URL.createObjectURL(file));
      setIsCropping(false);
      onImageReady(file);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setRawImageSrc(null);
  };

  return (
    <div className={className}>
      {croppedPreview ? (
        <div className="relative">
          <img src={croppedPreview} alt="Selected" className="w-full max-h-64 object-contain rounded-2xl border border-border" />
          <label className="mt-2 inline-block text-sm text-primary font-medium cursor-pointer hover:underline">
            Change photo
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      ) : (
        <label className={`block w-full border-2 border-dashed border-border rounded-2xl p-12 text-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-accent-light/10'}`}>
          <svg className="w-8 h-8 mx-auto mb-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-sm font-medium text-foreground">{triggerLabel}</span>
          <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={handleFileSelect} />
        </label>
      )}

      {isCropping && rawImageSrc && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="relative w-full" style={{ height: '360px', background: '#111' }}>
              <Cropper
                image={rawImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4">
              <label className="block text-xs text-muted mb-1.5">Zoom</label>
              <input
                type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full mb-4"
              />
              <div className="flex gap-2">
                <button type="button" onClick={cancelCrop} className="flex-1 py-3 rounded-xl border border-border text-muted font-medium">
                  Cancel
                </button>
                <button
                  type="button" onClick={confirmCrop} disabled={isProcessing}
                  className="flex-1 py-3 rounded-xl bg-primary text-surface font-bold disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Crop & use'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
