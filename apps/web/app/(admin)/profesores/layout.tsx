import { requireModule } from '../../lib/modules'

export default async function TeachersModuleLayout({ children }: { children: React.ReactNode }) {
  await requireModule('classes')
  return children
}
