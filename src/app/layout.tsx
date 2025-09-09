import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import "./critical.css";
import "./globals.css";
import { ConvexProvider } from "@/providers/ConvexProvider";
import { OfflineFirstWrapper } from "@/providers/OfflineFirstWrapper";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { LazyAnalytics, LazySpeedInsights, LazyToaster, LazyEnhancedNetworkStatusIndicator } from "@/components/LazyComponents";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageWrapper } from "@/components/LanguageWrapper";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: true,
});

const iranSansX = localFont({
  src: [
    {
      path: "./fonts/IRANSansXV.woff2",
      style: "normal",
    },
    {
      path: "./fonts/IRANSansXV.woff",
      style: "normal",
    },
  ],
  variable: "--font-iran-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Reduced weights
  variable: "--font-poppins",
  display: "swap",
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your daily expenses with ease",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Expense Tracker" />
      </head>
      <body className={`${poppins.variable} ${geistMono.variable} ${iranSansX.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <ServiceWorkerRegistration />
          <ConvexProvider>
            <AuthProvider>
              <OfflineFirstWrapper>
                <SettingsProvider>
                  <LanguageWrapper>
                    <OfflineProvider>
                      {children}
                      <div id="modal-root"></div>
                      <LazyEnhancedNetworkStatusIndicator />
                      {/* <OfflineModeIndicator /> */}
                      <LazyToaster position="top-center" />
                    </OfflineProvider>
                  </LanguageWrapper>
                </SettingsProvider>
              </OfflineFirstWrapper>
            </AuthProvider>
          </ConvexProvider>
        </ErrorBoundary>
        <LazyAnalytics />
        <LazySpeedInsights />
      </body>
    </html>
  );
}
