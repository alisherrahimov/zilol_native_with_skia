import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Zilol Native — Documentation',
  description: 'Next-generation rendering framework. Fine-grained reactivity meets Skia GPU rendering.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="layout-wrapper">
          <Sidebar />
          <Navbar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
