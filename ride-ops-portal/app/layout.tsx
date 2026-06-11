import type { Metadata } from 'next';
import './globals.css';
import { RootLayoutContent } from './layout-content';

export const metadata: Metadata = {
  title: 'Ops Portal',
  description: 'Ride Operations Control Center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  );
}
