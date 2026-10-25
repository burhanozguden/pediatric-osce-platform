import type { ReactNode } from 'react';

export const metadata = {
  title: 'Pediatrik Klinik Beslenme YZ OSCE Platformu',
  description: 'BDB-UÇEP 2025 uyumlu YZ destekli pediatrik beslenme OSCE simülasyonu',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
