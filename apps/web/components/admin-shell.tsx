'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { modules, type ModuleId } from '@aprende-padel/module-kit'
import { LogoutButton } from './logout-button'
import { Menu } from './ui/menu'

export function AdminSidebar({ enabled }: { enabled: ModuleId[] }) {
  const pathname = usePathname()
  const available = modules.filter((module) => enabled.includes(module.id) && ['classes', 'payments'].includes(module.id))
  const nav = [...available.map((module) => ({ href: module.href, label: module.name })), ...(enabled.includes('classes') ? [{ href: '/grupos', label: 'Grupos' }] : [])]
  const secondary = enabled.includes('classes') ? [{ href: '/alumnos', label: 'Alumnos' }, { href: '/profesores', label: 'Profesores' }, { href: '/clubes', label: 'Clubes' }] : []
  const moreItems = enabled.includes('classes') ? [{ label: 'Profesores', href: '/profesores', current: pathname.startsWith('/profesores') }, { label: 'Clubes', href: '/clubes', current: pathname.startsWith('/clubes') }] : []
  return <>
    <aside aria-label="Navegación del panel" className="hidden flex-col bg-emerald-950 px-5 py-7 text-emerald-50 md:fixed md:inset-y-0 md:left-0 md:flex md:w-[248px]">
      <Link className="mb-9 flex items-center gap-3 px-2 text-base font-semibold tracking-tight text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950" href="/"><span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-lime-300 text-emerald-950">A</span><span translate="no">AprendePadel</span></Link>
      <p id="primary-nav-title" className="mb-2 px-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Principal</p>
      <nav aria-labelledby="primary-nav-title" className="grid gap-1"><NavLink href="/" label="Resumen" active={pathname === '/'}/></nav>
      <p id="management-nav-title" className="mb-2 mt-7 px-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Gestión</p>
      <nav aria-labelledby="management-nav-title" className="grid gap-1">{nav.map((item) => <NavLink key={item.href} {...item} active={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}/>)}</nav>
      {secondary.length ? <nav aria-label="Más secciones" className="mt-4 grid gap-1 border-t border-emerald-800 pt-4">{secondary.map((item) => <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)}/>)}</nav> : null}
      <div className="mt-auto border-t border-emerald-800 px-2 pt-4 text-xs leading-5 text-emerald-300"><span translate="no">AprendePadel Academy</span><LogoutButton/></div>
    </aside>
    <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-1 overflow-x-auto border-t border-slate-200 bg-white/95 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-[0_-4px_20px_rgba(15,23,42,.06)] backdrop-blur md:hidden">
      <MobileLink href="/" label="Inicio" active={pathname === '/'}/>{enabled.includes('classes') ? <><MobileLink href="/clases" label="Clases" active={pathname.startsWith('/clases')}/><MobileLink href="/alumnos" label="Alumnos" active={pathname.startsWith('/alumnos')}/><MobileLink href="/grupos" label="Grupos" active={pathname.startsWith('/grupos')}/></> : null}{enabled.includes('payments') ? <MobileLink href="/pagos" label="Pagos" active={pathname.startsWith('/pagos')}/> : null}
      {moreItems.length ? <Menu portal side="top" label="Más navegación" items={moreItems}/> : null}
    </nav>
  </>
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) { return <Link aria-current={active ? 'page' : undefined} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 ${active ? 'bg-emerald-800 text-white' : 'text-emerald-100 hover:bg-emerald-900'}`} href={href}>{label}</Link> }
function MobileLink({ href, label, active }: { href: string; label: string; active: boolean }) { return <Link aria-current={active ? 'page' : undefined} className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-slate-600 hover:bg-slate-50'}`} href={href}>{label}</Link> }
