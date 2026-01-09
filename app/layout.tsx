import type { Metadata } from "next";
import "./globals.css";
import { ShipmentProvider } from "@/components/ShipmentContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";

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
      <body className="antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <Providers>
            <ShipmentProvider>
              {children}
            </ShipmentProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
