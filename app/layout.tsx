import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import localFont from 'next/font/local'
import './globals.css'
import { ToastProvider } from '@/components/ds/toast'
import { themeInitScript } from '@/components/ds/theme-toggle'

const onest = localFont({
  src: './onest-latin-wght-normal.woff2',
  display: 'swap',
  variable: '--font-onest',
  weight: '100 900',
})
export const metadata: Metadata = {
  title: 'AprendePadel | Academy Manager',
  description: 'Gestión de clubes y clases de pádel',
}
export const viewport: Viewport = { themeColor: '#f8fafc' }
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${onest.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <ToastProvider>
          <a
            className="fixed left-2 top-2 z-[100] -translate-y-[150%] rounded-xl bg-card px-4 py-3 font-bold text-foreground shadow-lg focus:translate-y-0"
            href="#main-content"
          >
            Saltar al contenido
          </a>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
