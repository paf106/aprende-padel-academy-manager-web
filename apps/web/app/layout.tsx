import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ToastProvider } from '../components/ui/toast'

const onest = localFont({ src: './onest-latin-wght-normal.woff2', display: 'swap', variable: '--font-onest', weight: '100 900' })
export const metadata: Metadata = { title: 'AprendePadel | Academy Manager', description: 'Gestión de clubes y clases de pádel' }
export const viewport: Viewport = { themeColor: '#f8fafc' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body className={`${onest.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased`}><ToastProvider><a className="skip-link" href="#main-content">Saltar al contenido</a>{children}</ToastProvider></body></html> }
