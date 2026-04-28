import type { Metadata } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { NavbarWrapper } from '@/components/common/navbar-wrapper';
import { ThemeProvider } from '@/components/layout/theme-provider';

const interTight = Inter_Tight({
  variable: '--font-sans',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Invy — Procesamiento de Facturas',
  description: 'Procesamiento y análisis de facturas XML del SAT',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider>
            <NavbarWrapper />
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
