'use client';

type BadgeVariant = 'buy' | 'sell' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  buy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  sell: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  neutral: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
};

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 text-xs font-semibold
        rounded-full whitespace-nowrap
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
