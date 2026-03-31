import type { Metadata } from "next";
import "@/src/index.css";
import { Providers } from "@/src/components/Providers";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "Vibe Trip",
  description: "AI-powered group travel planning app",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
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
      </body>
    </html>
  );
}
