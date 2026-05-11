import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Licensed to Haul — The Dashboard for Active Motor Carriers",
  description:
    "Live FMCSA profile, direct freight, and quotes on insurance, financing, fuel, equipment, and compliance — for active licensed motor carriers.",
  metadataBase: new URL("https://licensedtohaul.com"),
  openGraph: {
    title: "Licensed to Haul",
    description:
      "The dashboard for active licensed motor carriers. Live FMCSA profile, freight, insurance, financing, fuel, equipment, and compliance.",
    url: "https://licensedtohaul.com",
    siteName: "Licensed to Haul",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
