import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { formatInClubTime, statusLabels, attendanceLabels } from '@aprende-padel/core'
import { AttendanceForm } from './attendance-form'
import { SessionStatusForm } from './status-form'
import { MarkAllPresentButton } from './mark-all-present'
import { SessionEditForm } from './session-edit-form'
import {RosterForm} from './roster-form'
import {DeleteSessionButton} from './delete-session'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServer()
  const { data: session, error } = await supabase.schema('classes').from('sessions').select('id,starts_at,ends_at,status,notes,cancellation_reason,club_id,teacher_id,category').eq('id', id).maybeSingle()
  if (error || !session) notFound()
  const [{ data: club }, { data: teacher }, { data: enrolled }, { data: attendance }] = await Promise.all([
    supabase.schema('core').from('clubs').select('name,municipality,timezone').eq('id', session.club_id).maybeSingle(),
    supabase.schema('core').from('profiles').select('full_name').eq('id', session.teacher_id).maybeSingle(),
    supabase.schema('classes').from('session_students').select('student_id').eq('session_id', id),
    supabase.schema('classes').from('attendance').select('student_id,status,comment').eq('session_id', id),
  ])
  const studentIds = (enrolled ?? []).map((item) => item.student_id)
  const studentsResult = await supabase.schema('core').from('students').select('id,first_name,last_name').eq('club_id',session.club_id).eq('category',session.category).eq('active',true).order('last_name').limit(100)
  if (studentsResult.error) throw new Error('No se pudo cargar la lista de alumnos')
  const students = studentsResult.data ?? []
  const attendanceMap = new Map((attendance ?? []).map((item) => [item.student_id, item]))
  const tz = club?.timezone ?? 'Europe/Madrid'
  return <main className="main"><Link href="/clases" className="back-link">← Volver al calendario</Link><header className="session-detail-head"><div><p className="eyebrow">Detalle de sesión</p><h1>{club?.name ?? 'Clase'}</h1><p className="subtle">{formatInClubTime(session.starts_at,tz)} · {teacher?.full_name ?? 'Profesor sin asignar'}</p><p className="subtle">{formatInClubTime(session.ends_at,tz,{timeOnly:true})} · {studentIds.length} inscritos</p></div><div className="status-column"><span className={`pill ${session.status}`}>{statusLabels[session.status]}</span><SessionStatusForm sessionId={id} initialStatus={session.status} /><DeleteSessionButton sessionId={id}/></div></header><SessionEditForm sessionId={id} startsAt={session.starts_at} endsAt={session.ends_at} notes={session.notes??''} timeZone={tz}/>{session.cancellation_reason ? <p className="form-message error">Motivo: {session.cancellation_reason}</p> : null}{session.notes ? <p className="session-notes">{session.notes}</p> : null}<section className="panel"><div className="panel-head"><h2>Alumnos inscritos</h2><MarkAllPresentButton sessionId={id}/></div><RosterForm sessionId={id} students={students} enrolled={studentIds}/></section><section className="panel"><div className="panel-head"><h2>Asistencia</h2></div>{students.filter(student=>studentIds.includes(student.id)).map((student) => {const mark=attendanceMap.get(student.id);return <div className="attendance-row" key={student.id}><div><strong>{student.first_name} {student.last_name}</strong><span>{mark ? attendanceLabels[mark.status] : 'Sin marcar'}</span>{mark?.comment ? <small>{mark.comment}</small> : null}</div><AttendanceForm sessionId={id} studentId={student.id} initialStatus={mark?.status ?? undefined} /></div>})}</section></main>
}
