import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Martian_Mono } from "next/font/google";
import ChatDock from "@/components/ChatDock";
import CountryTheme from "@/components/CountryTheme";
import AppShell from "@/components/AppShell";
import { AppProvider } from "@/lib/state";
import "./globals.css";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OVEREASE: plan your degree abroad",
  description:
    "Pick a country, set your budget, and get a shortlist, a cost breakdown and personalised application drafts for studying abroad.",
};

export const viewport: Viewport = {
  themeColor: "#eef1f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrument.variable} ${martian.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <AppProvider>
          <CountryTheme />
          <AppShell>{children}</AppShell>
          <ChatDock />
        </AppProvider>
      </body>
    </html>
  );
}
