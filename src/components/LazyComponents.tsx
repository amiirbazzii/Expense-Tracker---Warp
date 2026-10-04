"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load heavy components
export const LazyChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Chart })), {
  loading: () => <div className="h-64 bg-surface-sunken animate-pulse rounded-lg"></div>,
  ssr: false,
});

export const LazyToaster = dynamic(
  () =>
    import('sonner').then((mod) => {
      const SonnerToaster = mod.Toaster;
      return {
        default: (props: React.ComponentProps<typeof SonnerToaster>) => (
          <SonnerToaster
            theme="system"
            toastOptions={{
              className: "bg-surface-raised text-ink-primary border border-border-subtle shadow-card",
            }}
            {...props}
          />
        ),
      };
    }),
  {
    loading: () => null,
    ssr: false,
  }
);
