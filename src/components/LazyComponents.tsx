import dynamic from 'next/dynamic';

// Lazy load heavy components
export const LazyChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Chart })), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>,
  ssr: false,
});

export const LazyAnalytics = dynamic(() => import('@vercel/analytics/next').then(mod => ({ default: mod.Analytics })), {
  ssr: false,
});

export const LazySpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then(mod => ({ default: mod.SpeedInsights })), {
  ssr: false,
});

export const LazyToaster = dynamic(() => import('sonner').then(mod => ({ default: mod.Toaster })), {
  loading: () => null,
  ssr: false,
});

export const LazyEnhancedNetworkStatusIndicator = dynamic(() => import('@/components/EnhancedNetworkStatusIndicator').then(mod => ({ default: mod.EnhancedNetworkStatusIndicator })), {
  loading: () => null,
  ssr: false,
});