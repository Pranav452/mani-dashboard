import type { Metadata } from "next";
import "./globals.css";
import { ShipmentProvider } from "@/components/ShipmentContext";
import { ThemeProvider } from "@/components/theme-provider";

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
          <ShipmentProvider>
            {children}
          </ShipmentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
