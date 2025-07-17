import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ConvexProvider } from "@/providers/ConvexProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { Toaster } from "sonner";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your daily expenses with ease",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>

      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexProvider>
          <AuthProvider>
            <SettingsProvider>
              <OfflineProvider>
                {children}
                <div id="modal-root"></div>
                <NetworkStatusIndicator />
                <Toaster position="top-center" />
              </OfflineProvider>
            </SettingsProvider>
          </AuthProvider>
        </ConvexProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
