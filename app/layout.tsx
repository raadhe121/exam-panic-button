import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaSetup from "@/components/PwaSetup";
import AuthProvider from "@/components/AuthProvider";
import SiteHeader from "@/components/SiteHeader";
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
  title: "Exam Panic Button",
  applicationName: "Exam Panic Button",
  appleWebApp: { capable: true, title: "Panic Button", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  description: "Tell it when your exam is and what you still don't know. Get a calm, hour-by-hour revision plan for tonight.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0e13",
};

const themeScript = `try{var t=localStorage.getItem("epb:theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <PwaSetup />
        <AuthProvider>
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8 sm:py-10">
            <SiteHeader />
            <main id="main" className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
