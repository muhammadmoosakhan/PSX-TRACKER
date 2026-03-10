'use client';

import { useRef } from 'react';
import { Camera, Trash2, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';
import { useToast } from '@/components/ui/Toast';

export default function ProfileSection() {
  const { user } = useAuth();
  const { avatarUrl, uploading, uploadAvatar, removeAvatar } = useAvatar();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const userEmail = user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase() || 'U';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image must be under 2MB.');
      return;
    }

    const success = await uploadAvatar(file);
    if (success) {
      showToast('success', 'Profile picture updated!');
    } else {
      showToast('error', 'Failed to upload. Make sure storage is configured.');
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = async () => {
    const success = await removeAvatar();
    if (success) {
      showToast('success', 'Profile picture removed.');
    } else {
      showToast('error', 'Failed to remove picture.');
    }
  };

  return (
    <Card hoverable={false} className="md:col-span-2">
      <h3
        className="text-base font-semibold mb-5 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
      >
        <User size={18} style={{ color: 'var(--accent-primary)' }} />
        Profile
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar preview */}
        <div className="relative group">
          <Avatar src={avatarUrl} initial={userInitial} size="xl" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <Camera size={24} className="text-white" />
          </button>
        </div>

        {/* Info + actions */}
        <div className="flex-1 text-center sm:text-left">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {userEmail}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            JPG, PNG or GIF. Max 2MB. Will be cropped to a circle.
          </p>

          <div className="flex gap-2 justify-center sm:justify-start">
            <Button
              variant="primary"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={14} />
              {avatarUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {avatarUrl && (
              <Button variant="ghost" size="sm" onClick={handleRemove}>
                <Trash2 size={14} />
                Remove
              </Button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </Card>
  );
}
