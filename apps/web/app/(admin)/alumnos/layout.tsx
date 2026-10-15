import { requireModule } from '../../lib/modules'

export default async function StudentsModuleLayout({ children }: { children: React.ReactNode }) {
  await requireModule('classes')
  return children
}
