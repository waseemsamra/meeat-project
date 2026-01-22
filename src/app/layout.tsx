
import type { Metadata } from 'next';
import './globals.css';

import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/CartProvider';
import { BoxBuilderProvider } from '@/context/BoxBuilderProvider';
import { FirebaseClientProvider } from '@/firebase';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { SettingsProvider } from '@/context/SettingsProvider';
import { LanguageProvider } from '@/context/LanguageProvider';
import { HtmlWithDirection } from './HtmlWithDirection';

export const metadata: Metadata = {
  title: "Me'eat",
  description: 'Specialty Beef and Lamb E-Commerce Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FirebaseClientProvider>
      <LanguageProvider>
        <HtmlWithDirection>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
              href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap"
              rel="stylesheet"
            />
          </head>
          <body className={cn('min-h-screen bg-background font-body antialiased')} suppressHydrationWarning>
              <SettingsProvider>
                <CartProvider>
                  <BoxBuilderProvider>
                    <div className="relative flex min-h-dvh flex-col bg-background">
                        <Suspense fallback={<div className="h-24 w-full" />}>
                          <Header />
                        </Suspense>
                        <main className="flex-1">{children}</main>
                        <Footer />
                    </div>
                    <Toaster />
                  </BoxBuilderProvider>
                </CartProvider>
              </SettingsProvider>
          </body>
        </HtmlWithDirection>
      </LanguageProvider>
    </FirebaseClientProvider>
  );
}
