import {requireModule} from '../clases/guard'
export default async function PaymentsModuleLayout({children}:{children:React.ReactNode}){await requireModule('payments');return children}
