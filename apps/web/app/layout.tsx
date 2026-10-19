import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ToastProvider } from '../components/ui/toast'

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
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${onest.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased`}>
        <ToastProvider>
          <a
            className="fixed left-2 top-2 z-[100] -translate-y-[150%] rounded-xl bg-white px-4 py-3 font-bold text-slate-900 shadow-lg focus:translate-y-0"
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
