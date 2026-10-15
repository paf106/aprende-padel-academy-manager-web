import { requireModule } from '../../lib/modules'
export default async function PaymentsModuleLayout({ children }: { children: React.ReactNode }) {
  await requireModule('payments')
  return children
}
