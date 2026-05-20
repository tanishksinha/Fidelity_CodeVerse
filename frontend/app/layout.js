import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "./provider";
import NudgeOverlay from "@/components/consumer/NudgeOverlay";
import "./globals.css"; // We will add the Tailwind directives here later

// Optimize fonts at build time. Zero layout shift.
const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: "Synaptic Investments | Wealth Management",
  description: "Institutional-grade wealth management and financial planning.",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning is required for next-themes to prevent flicker
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-fidelity-light text-warroom-bg transition-colors duration-300">
        <Providers>
          {/* 
            The Ghost SDK will be injected here via the layout, 
            ensuring it tracks across all route changes seamlessly.
          */}
          <main className="min-h-screen flex flex-col">
            {children}
          </main>
          <NudgeOverlay />
        </Providers>
        <Script src="/tracker.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
