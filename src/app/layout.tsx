import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/hooks/useAuth";
import AppShell from "@/components/layout/AppShell";
import { Suspense } from "react";
import GlobalChat from "@/components/chat/GlobalChat";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PSX Portfolio Tracker",
  description:
    "Track your Pakistan Stock Exchange investments — trades, portfolio, analysis, and risk management.",
  keywords: ["PSX", "Pakistan Stock Exchange", "portfolio tracker", "investment"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ToastProvider>
          <AuthProvider>
            <AppShell>
              {children}
            </AppShell>
            <Suspense fallback={null}>
              <GlobalChat />
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
