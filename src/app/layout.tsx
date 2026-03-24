import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ChatStream — Lecteur de chat Twitch",
  description: "Lisez n'importe quel chat Twitch en temps réel dans un format document clair et exportable.",
};

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open+Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Merriweather',
  'Source+Code+Pro',
  'Nunito',
  'PT+Serif',
].join('&family=');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          id="google-fonts"
          href={`https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS}&display=swap`}
          rel="stylesheet"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('google-fonts').onload=function(){this.media='all'}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
