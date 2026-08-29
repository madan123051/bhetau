import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Devanagari } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://bhetau.example"),
  title: { default: "bhetau — Meet someone worth meeting", template: "%s · bhetau" },
  description: "A Nepal-focused, personality-first way to meet someone worth meeting.",
  applicationName: "bhetau",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "bhetau", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "bhetau — Meet someone worth meeting",
    description: "Made for connections that feel real.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "bhetau — Meet someone worth meeting" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "bhetau — Meet someone worth meeting",
    description: "Made for connections that feel real.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF9F6" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0C0E" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${devanagari.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
