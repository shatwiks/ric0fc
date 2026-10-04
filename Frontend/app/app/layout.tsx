import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import "./globals.css";

const signifier = Newsreader({
  variable: "--font-signifier",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const sohne = Inter({
  variable: "--font-sohne",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RicozViz — Serif Analytics on Warm Paper",
  description: "Enterprise analytics as editorial. Powered by your semantic model with governed metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${signifier.variable} ${sohne.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#ffffff] text-[#17191c] antialiased selection:bg-[#fbe1d1] selection:text-[#5d2a1a]">
        {children}
      </body>
    </html>
  );
}

