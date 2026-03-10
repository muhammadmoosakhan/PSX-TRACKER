'use client';

interface AvatarProps {
  src?: string | null;
  initial?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

export default function Avatar({ src, initial = '?', size = 'sm', className = '' }: Readonly<AvatarProps>) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Profile"
        className={`rounded-full object-cover flex-shrink-0 ${sizeMap[size]} ${className}`}
        style={{ border: '2px solid var(--border-light)' }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white ${sizeMap[size]} ${className}`}
      style={{ background: 'var(--accent-primary)' }}
    >
      {initial}
    </div>
  );
}
