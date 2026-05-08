import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PublicCookieBanner, PublicFooter, PublicHeader } from '@/components/layout/ConditionalChrome';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Encontra Talentos — Portal de Recrutamento',
  description: 'Encontre oportunidades para impulsionar sua carreira.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <PublicHeader />
          <main className="flex-1">{children}</main>
          <PublicFooter />
        </div>
        <PublicCookieBanner />
      </body>
    </html>
  );
}
