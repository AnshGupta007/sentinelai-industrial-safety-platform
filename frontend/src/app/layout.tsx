import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/common/Toast";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SentinelAI — Industrial Safety Intelligence",
  description: "AI-Powered Industrial Safety Intelligence Platform. Data existed. Intelligence did not. Until now.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="bg-[#0A0F1E] text-gray-50 antialiased min-h-screen font-sans">
        <ErrorBoundary>
          <WebSocketProvider>
            <ToastProvider>{children}</ToastProvider>
          </WebSocketProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
