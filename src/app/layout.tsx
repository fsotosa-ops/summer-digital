import type { Metadata } from "next";
import { Montserrat, Be_Vietnam_Pro, Anton } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-primary",
  subsets: ["latin"],
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-secondary",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-subtitles",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Summer UP",
  description: "Summer UP — Tu plataforma de experiencias",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${beVietnam.variable} ${anton.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
