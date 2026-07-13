import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SellerOps AI — Autonomous Operations Manager",
    template: "%s | SellerOps AI",
  },
  description:
    "AI-powered autonomous operations manager for Indian e-commerce sellers on Meesho, Amazon, and Flipkart. Monitor, investigate, and resolve operational issues automatically.",
  keywords: ["meesho seller", "ai operations", "e-commerce automation", "seller tools", "return rate"],
  authors: [{ name: "SellerOps AI" }],
  robots: "noindex, nofollow", // Prototype — not for public indexing
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--color-surface-1)] text-[var(--color-text-primary)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
