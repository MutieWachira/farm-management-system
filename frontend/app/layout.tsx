import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import packageJson from "../package.json";
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
  title: "AgriCore",
  description: "Farm management for agricultural operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mt-auto border-t border-gray-200 px-4 py-3 text-center text-xs text-gray-500">
          AgriCore v{packageJson.version}
        </footer>
      </body>
    </html>
  );
}
