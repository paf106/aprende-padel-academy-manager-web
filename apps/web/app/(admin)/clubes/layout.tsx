import { requireModule } from '../../lib/modules'

export default async function ClubsModuleLayout({ children }: { children: React.ReactNode }) {
  await requireModule('classes')
  return children
}
