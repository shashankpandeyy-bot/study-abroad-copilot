import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ChatDock from "@/components/ChatDock";
import Nav from "@/components/Nav";
import { AppProvider } from "@/lib/state";
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
  title: "Study Abroad Co-Pilot",
  description:
    "Find universities that fit you, explore what-if changes, and get personalised application drafts for studying abroad.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <Nav />
          <div className="flex flex-1 flex-col">{children}</div>
          <ChatDock />
        </AppProvider>
      </body>
    </html>
  );
}
