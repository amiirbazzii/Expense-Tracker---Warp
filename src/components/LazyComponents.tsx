"use client";

import dynamic from 'next/dynamic';

// Lazy load heavy components
export const LazyChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Chart })), {
  loading: () => <div className="h-64 bg-surface-sunken animate-pulse rounded-lg"></div>,
  ssr: false,
});



export const LazyToaster = dynamic(() => import('sonner').then(mod => ({ default: mod.Toaster })), {
  loading: () => null,
  ssr: false,
});
