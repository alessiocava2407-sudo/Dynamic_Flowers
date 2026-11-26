import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Giardino di Gigli e Peonie";
const description =
  "Un giardino notturno interattivo: gigli e peonie fioriscono al passaggio del puntatore.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Fioritura",
  metadataBase: new URL("https://alessiocava2407-sudo.github.io/Dynamic_Flowers/"),
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
