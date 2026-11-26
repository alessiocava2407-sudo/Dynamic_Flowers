import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Interactive Canvas";
const description =
  "Un'esperienza visiva interattiva: muovi il mouse o tocca lo schermo per far crescere i fiori.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Interactive Canvas",
  metadataBase: new URL("https://alessiocava2407-sudo.github.io/Interactive-Canvas/"),
  openGraph: {
    title,
    description,
    type: "website",
    locale: "it_IT",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom must stay available: blocking it violates WCAG 1.4.4.
  viewportFit: "cover",
  themeColor: "#090a0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
