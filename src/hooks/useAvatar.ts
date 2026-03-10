'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

const BUCKET = 'avatars';

export function useAvatar() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const getAvatarPath = useCallback(() => {
    if (!user) return null;
    return `${user.id}/avatar`;
  }, [user]);

  // Fetch avatar URL on mount
  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    const path = `${user.id}/avatar`;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    // Check if image actually exists by adding a cache-buster
    const testUrl = `${data.publicUrl}?t=${Date.now()}`;
    const img = new Image();
    img.onload = () => setAvatarUrl(testUrl);
    img.onerror = () => setAvatarUrl(null);
    img.src = testUrl;
  }, [user]);

  const uploadAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      const path = getAvatarPath();
      if (!path) return false;

      // Validate file
      if (!file.type.startsWith('image/')) return false;
      if (file.size > 2 * 1024 * 1024) return false; // 2MB max

      setUploading(true);

      // Resize image to 256x256 before uploading
      const resized = await resizeImage(file, 256);

      const { error } = await supabase.storage.from(BUCKET).upload(path, resized, {
        upsert: true,
        contentType: resized.type,
      });

      if (error) {
        console.error('Avatar upload error:', error.message);
        setUploading(false);
        return false;
      }

      // Get fresh URL
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      setUploading(false);
      return true;
    },
    [getAvatarPath]
  );

  const removeAvatar = useCallback(async (): Promise<boolean> => {
    const path = getAvatarPath();
    if (!path) return false;

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error('Avatar remove error:', error.message);
      return false;
    }

    setAvatarUrl(null);
    return true;
  }, [getAvatarPath]);

  return { avatarUrl, uploading, uploadAvatar, removeAvatar };
}

/** Resize image to maxSize maintaining aspect ratio, returns Blob */
function resizeImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = maxSize;
      canvas.height = maxSize;

      const ctx = canvas.getContext('2d')!;
      // Draw centered crop
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);

      canvas.toBlob(
        (blob) => resolve(blob || new Blob()),
        'image/jpeg',
        0.85
      );
    };

    img.src = url;
  });
}
