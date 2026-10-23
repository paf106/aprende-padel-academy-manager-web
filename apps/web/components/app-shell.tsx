'use client'

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileUp,
  Settings,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Search,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useState, useSyncExternalStore, type ReactNode } from 'react'
import { getModuleRoutes, type ModuleId } from '@aprende-padel/module-kit'
import { cn } from '@aprende-padel/ui/cn'
import { ClubSwitcher } from './ds/club-switcher'
import { CommandPalette, type CommandItem } from './ds/command-palette'
import { ThemeToggle } from './ds/theme-toggle'
import { LogoutButton } from './logout-button'

const icons: Record<string, LucideIcon> = {
  '/': LayoutDashboard,
  '/clases': CalendarDays,
  '/grupos': Users,
  '/alumnos': GraduationCap,
  '/profesores': UserRound,
  '/clubes': MapPin,
  '/pagos': CreditCard,
  '/importar': FileUp,
  '/configuracion-inicial': Settings,
  '/ajustes': Settings,
}

const COLLAPSE_KEY = 'sidebar-collapsed'
const subscribeStorage = (cb: () => void) => {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

export function AppShell({
  enabled,
  clubs,
  searchItems,
  children,
}: {
  enabled: ModuleId[]
  clubs: readonly { id: string; name: string }[]
  searchItems: readonly CommandItem[]
  children: ReactNode
}) {
  const pathname = usePathname()
  const storedCollapsed = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
    () => false,
  )
  const [override, setOverride] = useState<boolean | null>(null)
  const collapsed = override ?? storedCollapsed

  const primary = [{ href: '/', label: 'Resumen' }, ...getModuleRoutes(enabled, 'primary')]
  const secondary = getModuleRoutes(enabled, 'secondary')
  const commands: CommandItem[] = [
    ...[...primary, ...secondary].map((r) => ({ id: r.href, label: r.label, href: r.href, group: 'Ir a' })),
    ...searchItems,
  ]
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const toggle = () => {
    const next = !collapsed
    setOverride(next)
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        aria-label="Navegación del panel"
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card px-3 py-5 transition-[width] duration-200 md:flex',
          collapsed ? 'w-[72px]' : 'w-[248px]',
        )}
      >
        <Link href="/" className="mb-8 flex items-center gap-3 px-2" aria-label="AprendePadel, inicio">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand font-bold text-brand-foreground"
          >
            A
          </span>
          {collapsed ? null : (
            <span translate="no" className="text-[15px] font-semibold tracking-tight">
              AprendePadel
            </span>
          )}
        </Link>
        <nav aria-label="Principal" className="grid gap-1">
          {primary.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
          ))}
        </nav>
        {secondary.length ? (
          <nav aria-label="Más secciones" className="mt-4 grid gap-1 border-t border-border pt-4">
            {secondary.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
            ))}
          </nav>
        ) : null}
        <div className="mt-auto grid gap-1">
          {collapsed ? null : <LogoutButton />}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className="flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {collapsed ? (
              <ChevronsRight size={18} aria-hidden="true" />
            ) : (
              <ChevronsLeft size={18} aria-hidden="true" />
            )}
            {collapsed ? null : 'Contraer'}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          'pb-24 transition-[padding] duration-200 md:pb-0',
          collapsed ? 'md:pl-[72px]' : 'md:pl-[248px]',
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
            className="flex h-10 w-full max-w-md cursor-pointer items-center gap-3 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground hover:border-muted-foreground/40"
          >
            <Search size={16} aria-hidden="true" />
            <span className="flex-1 text-left">Buscar…</span>
            <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] sm:block">
              Ctrl K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Suspense fallback={null}>
              <ClubSwitcher clubs={clubs} />
            </Suspense>
            <ThemeToggle />
          </div>
        </header>
        <div id="main-content" tabIndex={-1} className="min-w-0 focus-visible:outline-none">
          {children}
        </div>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-1 overflow-x-auto border-t border-border bg-card/95 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur md:hidden"
      >
        {primary.map((item) => {
          const Icon = icons[item.href] ?? LayoutDashboard
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium',
                isActive(item.href) ? 'bg-brand-soft text-brand' : 'text-muted-foreground',
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <CommandPalette items={commands} />
    </div>
  )
}

function NavLink({
  href,
  label,
  active,
  collapsed,
}: {
  href: string
  label: string
  active: boolean
  collapsed: boolean
}) {
  const Icon = icons[href] ?? LayoutDashboard
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
        active ? 'bg-brand-soft text-brand' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon size={18} aria-hidden="true" className="shrink-0" />
      {collapsed ? null : label}
    </Link>
  )
}
