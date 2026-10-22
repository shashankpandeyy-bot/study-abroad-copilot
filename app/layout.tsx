import type { Metadata, Viewport } from "next";
import { Figtree, Martian_Mono } from "next/font/google";
import ChatDock from "@/components/ChatDock";
import CountryTheme from "@/components/CountryTheme";
import AppShell from "@/components/AppShell";
import { AppProvider } from "@/lib/state";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${martian.variable} h-full`}>
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
