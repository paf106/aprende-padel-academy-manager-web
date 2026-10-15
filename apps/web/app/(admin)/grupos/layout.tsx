import { requireModule } from '../../lib/modules'

export default async function GroupsModuleLayout({ children }: { children: React.ReactNode }) {
  await requireModule('classes')
  return children
}
