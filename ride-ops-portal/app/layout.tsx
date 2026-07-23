import type { Metadata } from 'next';
import './globals.css';
import { RootLayoutContent } from './layout-content';
import { ApiProviders } from '@/lib/shared/api';

export const metadata: Metadata = {
  title: 'Ops Portal',
  description: 'Ride Operations Control Center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <ApiProviders>
          <RootLayoutContent>{children}</RootLayoutContent>
        </ApiProviders>
      </body>
    </html>
  );
}
