import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { AttendanceForm } from './attendance-form'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServer()
  const { data: session, error } = await supabase.schema('classes').from('sessions').select('id,starts_at,ends_at,status,notes,club_id,teacher_id').eq('id', id).maybeSingle()
  if (error || !session) notFound()
  const [{ data: club }, { data: teacher }, { data: enrolled }, { data: attendance }] = await Promise.all([
    supabase.schema('core').from('clubs').select('name,municipality').eq('id', session.club_id).maybeSingle(),
    supabase.schema('core').from('profiles').select('full_name').eq('id', session.teacher_id).maybeSingle(),
    supabase.schema('classes').from('session_students').select('student_id').eq('session_id', id),
    supabase.schema('classes').from('attendance').select('student_id,status,comment').eq('session_id', id),
  ])
  const studentIds = (enrolled ?? []).map((item) => item.student_id)
  const { data: students } = studentIds.length ? await supabase.schema('core').from('students').select('id,first_name,last_name').in('id', studentIds).order('last_name') : { data: [] }
  const attendanceMap = new Map((attendance ?? []).map((item) => [item.student_id, item.status]))
  return <div className="app"><aside className="sidebar"><div className="brand"><span className="brand-mark" /> AprendePadel</div><nav className="nav"><Link href="/">Resumen <span>⌂</span></Link><Link className="active" href="/clases">Clases <span>›</span></Link></nav></aside><main className="main"><Link href="/clases" className="back-link">← Volver al calendario</Link><div className="session-detail-head"><div><div className="eyebrow">Detalle de sesión</div><h1>{club?.name ?? 'Clase'}</h1><p className="subtle">{new Date(session.starts_at).toLocaleString('es-ES')} · {teacher?.full_name ?? 'Profesor sin asignar'}</p></div><span className={`pill ${session.status === 'completed' ? 'orange' : ''}`}>{session.status}</span></div><div className="panel"><div className="panel-head"><h2>Asistencia · {students?.length ?? 0} alumnos</h2></div>{students?.map((student) => <div className="attendance-row" key={student.id}><div><strong>{student.first_name} {student.last_name}</strong><span>{attendanceMap.get(student.id) ?? 'Sin marcar'}</span></div><AttendanceForm sessionId={id} studentId={student.id} initialStatus={attendanceMap.get(student.id) as 'present' | 'absent' | 'justified' | undefined} /></div>)}</div></main></div>
}
