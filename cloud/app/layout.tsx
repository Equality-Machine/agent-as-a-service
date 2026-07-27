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
    "Turn a Codex or Claude Code session into an Agent anyone can use. Every recipient gets a private conversation, while your original stays unchanged.",
  openGraph: {
    title: "AaaS — Agent as a Service",
    description:
      "Skip the briefing. Start with an Agent that already knows the work.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AaaS — start work with an Agent that already knows the context",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AaaS — Agent as a Service",
    description:
      "Skip the briefing. Start with an Agent that already knows the work.",
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
