import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Career Radar — Programming Hero",
  description:
    "Today's intern, fresher and junior web & software jobs in Bangladesh and remote — collected live from BDJobs, LinkedIn, Facebook groups and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} font-sans antialiased`}>
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}

