'use client';

import { cn } from '@/lib/utils';

interface LoadingProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ label = '読み込み中', className, size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  const blobSizes = {
    sm: 'w-6 h-6',
    md: 'w-[30px] h-[30px]',
    lg: 'w-9 h-9',
  };

  return (
    <div
      className={cn(
        'kp-loadpill kp-is-loading',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-busy="true"
    >
      <span className={cn('kp-blob', blobSizes[size])} aria-hidden="true">
        <span className="kp-eye kp-left" />
        <span className="kp-eye kp-right" />
        <span className="kp-mouth" />
        <span className="kp-cheek kp-c1" />
        <span className="kp-cheek kp-c2" />
        <span className="kp-shine" />
      </span>

      <span className="kp-label">{label}</span>
      <span className="kp-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

export function LoadingOverlay({ label = '読み込み中' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loading label={label} size="md" />
    </div>
  );
}

export function LoadingPage({ label = '読み込み中' }: { label?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <Loading label={label} size="lg" />
    </div>
  );
}
