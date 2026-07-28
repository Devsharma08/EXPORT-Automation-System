import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'EXPORT Automation System',
  description: 'Automated buyer discovery and Gmail outreach for Singing Bowls exporters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content" role="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
