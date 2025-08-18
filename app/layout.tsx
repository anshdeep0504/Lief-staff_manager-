import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "antd/dist/reset.css";
import Navigation from "./components/Navigation";
import AntdCompatibility from "./components/AntdCompatibility";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lief Healthcare - Staff Management",
  description: "Healthcare staff time tracking and management system",
  manifest: "/manifest.json",
  themeColor: "#1890ff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lief Healthcare",
  },
  openGraph: {
    title: "Lief Healthcare - Staff Management",
    description: "Healthcare staff time tracking and management system",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lief Healthcare - Staff Management",
    description: "Healthcare staff time tracking and management system",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lief Healthcare" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1890ff" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
        <meta name="theme-color" content="#1890ff" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <AntdCompatibility />
        <ServiceWorkerRegistration />
        
        <Navigation />
        {children}
      </body>
    </html>
  );
}
