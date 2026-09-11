import Link from 'next/link'
import { modules } from '@aprende-padel/module-kit'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { LogoutButton } from '../components/logout-button'
import { getSessions } from '../lib/classes-data'

type Club = { id: string; name: string; municipality: string }

export default async function Dashboard() {
  const supabase = await getSupabaseServer()
  const [{ data: user }, { data: clubs }, { count: studentCount }, { count: teacherCount }, { count: sessionCount }, sessions] = await Promise.all([
    supabase.auth.getUser(),
    supabase.schema('core').from('clubs').select('id,name,municipality').order('name'),
    supabase.schema('core').from('students').select('id', { count: 'exact', head: true }),
    supabase.schema('core').from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.schema('classes').from('sessions').select('id', { count: 'exact', head: true }),
    getSessions(undefined, undefined)
  ])
  const currentUser = user?.user ?? null
  const profileName = currentUser?.user_metadata?.full_name ?? currentUser?.email?.split('@')[0] ?? 'equipo'
  const typedClubs = (clubs ?? []) as Club[]
  const typedSessions = sessions ?? []
  return <div className="app">
    <aside className="sidebar"><div className="brand"><span className="brand-mark" /> AprendePadel</div><p className="nav-label">Workspace</p><nav className="nav"><Link className="active" href="/">Resumen <span>⌂</span></Link><Link href="/clases">Clases <span>›</span></Link><Link href="#">Alumnos <span>›</span></Link><Link href="#">Profesores <span>›</span></Link><Link href="#">Clubes <span>›</span></Link></nav><p className="nav-label" style={{ marginTop: 32 }}>Módulos</p><nav className="nav">{modules.slice(1).map((module) => <Link key={module.id} href="#" aria-disabled="true">{module.name} <span style={{ fontSize: 10 }}>Próximo</span></Link>)}</nav><div className="sidebar-foot">AprendePadel Academy<br /><span>Panel de administración</span></div></aside>
    <main className="main"><header className="topline"><div><div className="eyebrow">Panel de administración</div><h1>Buenos días, {profileName}.</h1><p className="subtle">Datos actuales de tus clubes en Supabase.</p></div><div className="profile"><div className="avatar">{profileName.slice(0, 2).toUpperCase()}</div><div><span>{currentUser?.email}</span><LogoutButton /></div></div></header>
      <section className="grid"><div className="metric"><div className="metric-label">Clases registradas</div><div className="metric-value">{sessionCount ?? 0}</div><div className="metric-note">Desde la base de datos</div></div><div className="metric"><div className="metric-label">Alumnos activos</div><div className="metric-value">{studentCount ?? 0}</div><div className="metric-note">En {typedClubs.length} clubes</div></div><div className="metric"><div className="metric-label">Profesores</div><div className="metric-value">{teacherCount ?? 0}</div><div className="metric-note">Perfiles activos</div></div><div className="metric"><div className="metric-label">Clubes</div><div className="metric-value">{typedClubs.length}</div><div className="metric-note">Organización actual</div></div></section>
      <section className="content-grid"><div className="panel"><div className="panel-head"><h2>Próximas clases</h2><Link href="/clases">Ver calendario →</Link></div>{typedSessions.length ? typedSessions.slice(0, 5).map((session) => <div className="session" key={session.id}><div className="time">{new Date(session.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div><div><div className="session-title">{session.club?.name ?? 'Club sin asignar'}</div><div className="session-meta">{session.teacher?.full_name ?? 'Profesor sin asignar'} · {session.studentCount} alumnos</div></div><span className={`pill ${session.status === 'completed' ? 'orange' : ''}`}>{session.status === 'completed' ? 'Terminada' : session.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}</span></div>) : <div className="empty-state">Todavía no hay clases registradas.</div>}</div><div className="panel"><div className="panel-head"><h2>Tus clubes</h2><span className="subtle">{typedClubs.length} activos</span></div><div className="club-list">{typedClubs.map((club) => <div className="club" key={club.id}><div className="club-dot" /><div><strong>{club.name}</strong><span>{club.municipality}</span></div></div>)}</div></div></section>
    </main></div>
}
