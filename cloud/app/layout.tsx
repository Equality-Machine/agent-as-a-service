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
  title: "Codex Sharing — Share the session. Continue the work.",
  description:
    "Share a deeply worked Codex or Claude Code session so someone else can continue the work in a private conversation, without changing your original.",
  openGraph: {
    title: "Codex Sharing",
    description:
      "Share the session. Continue the work.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Codex Sharing — share the session and continue the work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codex Sharing",
    description:
      "Share the session. Continue the work.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/codex-sharing-mark.png",
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
