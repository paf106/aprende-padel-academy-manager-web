import { requireModule } from '../../lib/modules'
export default async function ClassesModuleLayout({ children }: { children: React.ReactNode }) {
  await requireModule('classes')
  return children
}
