import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif_SC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "600",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "AaaS — Agent as a Service",
  description:
    "Open a shared Agent with the context and capabilities already built up, then continue on the web, in Codex, or in Claude Code.",
  openGraph: {
    title: "AaaS — Agent as a Service",
    description: "Find the Agent. Start from there.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "A shared Agent ready to continue the work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AaaS — Agent as a Service",
    description: "Find the Agent. Start from there.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
