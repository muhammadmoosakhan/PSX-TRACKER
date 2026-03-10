'use client';

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const roundedStyles = {
  sm: 'rounded-[8px]',
  md: 'rounded-[12px]',
  lg: 'rounded-[16px]',
  full: 'rounded-full',
};

export default function Skeleton({
  width = '100%',
  height = '20px',
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${roundedStyles[rounded]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <Skeleton height="14px" width="40%" />
      <Skeleton height="32px" width="60%" />
      <Skeleton height="14px" width="80%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton height="40px" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="48px" />
      ))}
    </div>
  );
}
