import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const onest = localFont({ src: './onest-latin-wght-normal.woff2', display: 'swap', variable: '--font-onest', weight: '100 900' })
export const metadata: Metadata = { title: 'AprendePadel | Academy Manager', description: 'Gestión de clubes y clases de pádel' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body className={`${onest.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased`}>{children}</body></html> }
