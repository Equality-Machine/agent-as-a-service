import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AaaS — Agent as a Service",
  description:
    "Publish a Codex or Claude session as a fork-safe agent, then use it from the web or your own coding agent.",
  openGraph: {
    title: "AaaS — Agent as a Service",
    description: "Immutable source. Independent conversation forks.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "One frozen Agent source branching into independent conversations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AaaS — Agent as a Service",
    description: "Immutable source. Independent conversation forks.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
