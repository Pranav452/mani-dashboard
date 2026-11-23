import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
import { ShipmentProvider } from "@/components/ShipmentContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import ScrollContext from "@/components/ScrollContext";

export const metadata: Metadata = {
  title: "Mani Dashboard",
  description: "Logistics Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <Providers>
            <ScrollContext>
              <ShipmentProvider>
                {children}
              </ShipmentProvider>
            </ScrollContext>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
