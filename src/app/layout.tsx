import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { GlobalAssistant } from "@/components/global-assistant";
import { CommandPalette } from "@/components/command-palette";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
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
  title: "EcoTrace India | AI-Powered E-Waste Collection, Traceability & Recycling",
  description:
    "Give discarded electronics a responsible journey. Connect with collection partners, identify e-waste with AI, discover collection hubs, and track transparent recycling across India.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#065f46" },
    { media: "(prefers-color-scheme: dark)", color: "#07130f" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans bg-[#f6fbf8] dark:bg-[#07130f] text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200 transition-colors duration-300">
        <Providers>{children}<GlobalAssistant /><CommandPalette /></Providers>
      </body>
    </html>
  );
}
