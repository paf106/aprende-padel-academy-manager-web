import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'AprendePadel | Academy Manager', description: 'Gestión de clubes y clases de pádel' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html> }
