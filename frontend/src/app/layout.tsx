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
  title: "AI Sustainability Discovery | 1M1B × IBM SkillsBuild",
  description:
    "AI-powered sustainability problem reporting and action platform. Discover, understand, prioritize, act, and measure real-world sustainability impact. Aligned with UN SDG 11 — Sustainable Cities and Communities.",
  keywords: [
    "sustainability",
    "AI",
    "SDG 11",
    "IBM",
    "1M1B",
    "campus sustainability",
    "environmental reporting",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
