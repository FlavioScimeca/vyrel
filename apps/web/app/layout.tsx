import type { Metadata } from "next";

import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";

import "./index.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApolloProvider } from "@/graphql/apollo/provider";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: "vyrel",
  title: "vyrel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn("font-mono", jetbrainsMono.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ApolloProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
