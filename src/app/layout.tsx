import type { Metadata } from "next";
import "@/src/index.css";
import { Providers } from "@/src/components/Providers";
import NextTopLoader from "nextjs-toploader";
import { OfflineBanner } from "@/src/components/pwa/OfflineBanner";
import { InstallPrompt } from "@/src/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/src/components/pwa/UpdatePrompt";
import { ServiceWorkerRegistration } from "@/src/components/pwa/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Vibe Trip",
  description: "AI-powered group travel planning app",
  icons: {
    icon: "/icons/logo.png",
    apple: "/icons/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <NextTopLoader
          color="#0ea5e9"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl
          showSpinner={false}
          easing="ease"
          speed={220}
          shadow="0 0 10px #0ea5e9,0 0 5px #0ea5e9"
        />
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <OfflineBanner />
        <InstallPrompt />
        <UpdatePrompt />
      </body>
    </html>
  );
}
