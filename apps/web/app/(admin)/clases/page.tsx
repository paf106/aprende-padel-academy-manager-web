import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { getClassReferenceData, getSessions } from '../../../lib/classes-data'
import { ClassesClient } from './classes-client'

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date()
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ week?: string; club?: string; teacher?: string; status?: string }> }) {
  const params = await searchParams
  const [reference,] = await Promise.all([getClassReferenceData()])
  const week = startOfWeek(validDate(params.week), { weekStartsOn: 1 })
  const end = addDays(week, 7)
  const isUuid = (value?: string) => !!value && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)
  const status = ['pending','completed','cancelled'].includes(params.status ?? '') ? params.status as 'pending'|'completed'|'cancelled' : undefined
  const sessions = await getSessions(week.toISOString(), end.toISOString(), 500, { clubId: isUuid(params.club) ? params.club : undefined, teacherId: isUuid(params.teacher) ? params.teacher : undefined, status })
  return <main className="main">
    <header className="page-header"><div><p className="eyebrow">Agenda semanal</p><h1>Clases</h1><p className="subtle">Semana del {format(week, 'd MMMM', { locale: es })} · {sessions.length} sesiones</p></div><ClassesClient refs={reference} /></header>
    <form className="filters" method="get"><input type="date" name="week" defaultValue={format(week,'yyyy-MM-dd')} aria-label="Semana" /><select name="club" defaultValue={params.club ?? ''} aria-label="Club"><option value="">Todos los clubes</option>{reference.clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><select name="teacher" defaultValue={params.teacher ?? ''} aria-label="Profesor"><option value="">Todos los profesores</option>{reference.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select><select name="status" defaultValue={status ?? ''} aria-label="Estado"><option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="completed">Terminada</option><option value="cancelled">Cancelada</option></select><button className="secondary-button">Filtrar</button></form>
    <div className="week-grid">{Array.from({ length: 7 }, (_, index) => { const date = addDays(week,index); const dayKey = format(date,'yyyy-MM-dd'); const daily = sessions.filter((session) => format(new Date(session.starts_at),'yyyy-MM-dd') === dayKey); return <section className="day-column" key={dayKey}><div className="day-head"><strong>{format(date,'EEE',{locale:es})}</strong><span>{format(date,'d')}</span></div>{daily.map((session) => <Link className={`calendar-card ${session.status}`} href={`/clases/${session.id}`} key={session.id}><strong>{format(new Date(session.starts_at),'HH:mm')}</strong><span>{session.club?.name ?? 'Club'}</span><small>{session.teacher?.full_name ?? 'Profesor'} · {session.studentCount} alumnos</small></Link>)}</section> })}</div>
    <div className="session-list"><h2>Lista de la semana</h2>{sessions.map((session) => <Link href={`/clases/${session.id}`} className="session-list-row" key={session.id}><strong>{format(new Date(session.starts_at),'EEE d MMM · HH:mm',{locale:es})}</strong><span>{session.club?.name} · {session.teacher?.full_name}</span><span className={`pill ${session.status}`}>{session.status === 'completed' ? 'Terminada' : session.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}</span></Link>)}</div>
  </main>
}
