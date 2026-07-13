import type { Metadata } from 'next';
import { Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './global.css';

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://eazip.io'),
  title: {
    default: 'Eazip — turn files and URLs into one ZIP',
    template: '%s · Eazip',
  },
  description:
    'Eazip packages files or remote URLs into a single ZIP, right in the browser — no backend, no zip server. Reach for the cloud only when a job outgrows the tab.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <RootProvider theme={{ defaultTheme: 'dark', enableSystem: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
