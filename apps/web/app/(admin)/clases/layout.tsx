import {requireModule} from './guard'
export default async function ClassesModuleLayout({children}:{children:React.ReactNode}){await requireModule('classes');return children}
