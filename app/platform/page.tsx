import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth'
import { PlatformView } from '@/app/platform/platform-view'

export const metadata = { title: 'Plataforma | AprendePadel' }

export default async function PlatformPage() {
  await requirePlatformAdmin()
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_PLATFORM_PANEL) notFound()
  return <PlatformView />
}
