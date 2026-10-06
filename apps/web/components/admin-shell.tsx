'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { modules, type ModuleId } from '@aprende-padel/module-kit'

export function AdminSidebar({ enabled }: { enabled: ModuleId[] }) {
  const pathname = usePathname()
  return <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark" /> AprendePadel</Link><p className="nav-label">Workspace</p><nav className="nav"><Link className={pathname === '/' ? 'active' : ''} href="/">Resumen</Link></nav><p className="nav-label" style={{ marginTop: 28 }}>Gestión</p><nav className="nav">{modules.filter((module) => enabled.includes(module.id)).map((module) => <Link className={pathname.startsWith(module.href) ? 'active' : ''} key={module.id} href={module.href}>{module.name}<span>›</span></Link>)}{enabled.includes('classes')?<Link className={pathname.startsWith('/grupos')?'active':''} href="/grupos">Grupos</Link>:null}</nav><nav className="nav secondary-nav"><Link className={pathname.startsWith('/alumnos') ? 'active' : ''} href="/alumnos">Alumnos</Link><Link className={pathname.startsWith('/profesores') ? 'active' : ''} href="/profesores">Profesores</Link><Link className={pathname.startsWith('/clubes') ? 'active' : ''} href="/clubes">Clubes</Link></nav><div className="sidebar-foot">AprendePadel Academy<br /><span>Panel de administración</span></div></aside>
}
