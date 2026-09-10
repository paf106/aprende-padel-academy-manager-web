import { SQL } from 'bun'

const connection = process.env.SUPABASE_DB_URL
const secret = process.env.SUPABASE_SECRET_KEY
const base = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!connection || !secret || !base) throw new Error('Supabase environment variables are required')

const url = new URL(connection)
const sql = new SQL({ hostname: url.hostname, port: Number(url.port || 5432), username: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) || 'postgres', tls: true, connectionTimeout: 10_000 })
const org = '00000000-0000-0000-0000-000000000001'
const users = [
  ['pabloavila106@gmail.com', 'Pablo Avila', 'admin'],
  ['marta.sanchez@aprendepadel.com', 'Marta Sánchez', 'teacher'],
  ['diego.martin@aprendepadel.com', 'Diego Martín', 'teacher'],
  ['laura.garcia@aprendepadel.com', 'Laura García', 'teacher'],
] as const

async function updateAuthUser(email: string, role: string) {
  const list = await fetch(`${base}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, { headers: { apikey: secret, Authorization: `Bearer ${secret}` } })
  const payload = await list.json() as { users?: { id: string; email?: string }[] }
  const user = payload.users?.find((item) => item.email === email)
  if (!user) throw new Error(`Auth user not found: ${email}`)
  const response = await fetch(`${base}/auth/v1/admin/users/${user.id}`, { method: 'PUT', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ app_metadata: { role, organization_id: org } }) })
  if (!response.ok) throw new Error(`Could not update Auth metadata for ${email}: ${await response.text()}`)
  return user.id
}

try {
  const authIds = new Map<string, string>()
  for (const [email, , role] of users) authIds.set(email, await updateAuthUser(email, role))
  for (const [email, name, role] of users) await sql`update core.profiles set full_name = ${name}, role = ${role}::core.app_role where id = ${authIds.get(email)} and organization_id = ${org}`

  const clubs = await sql`select id, slug from core.clubs where organization_id = ${org}`
  const teachers = await sql`select id, email from core.profiles where organization_id = ${org} and role = ${'teacher'}::core.app_role`
  const clubBySlug = new Map(clubs.map((club) => [club.slug, club.id]))
  const teacherByEmail = new Map(teachers.map((teacher) => [teacher.email, teacher.id]))
  const studentData = [
    ['Lucía', 'Gómez', 'adult', 'female', 'medio', 'ambite'], ['Javier', 'Ruiz', 'adult', 'male', 'principiante', 'ambite'], ['Nora', 'Serrano', 'child', 'female', 'iniciacion', 'ambite'], ['Hugo', 'Martínez', 'child', 'male', 'iniciacion', 'ambite'],
    ['Alba', 'Navarro', 'adult', 'female', 'avanzado', 'pioz'], ['Pablo', 'López', 'adult', 'male', 'medio', 'pioz'], ['Emma', 'Castro', 'child', 'female', 'principiante', 'pioz'], ['Leo', 'Vega', 'child', 'male', 'iniciacion', 'pioz'],
    ['Sofía', 'Santos', 'adult', 'female', 'competicion', 'pozuelo-del-rey'], ['Mario', 'Iglesias', 'adult', 'male', 'avanzado', 'pozuelo-del-rey'], ['Valeria', 'Molina', 'child', 'female', 'medio', 'pozuelo-del-rey'], ['Daniel', 'Ortega', 'child', 'male', 'principiante', 'pozuelo-del-rey'],
  ] as const
  const studentIds: string[] = []
  for (const [index, student] of studentData.entries()) {
    const id = crypto.randomUUID(); studentIds.push(id)
    await sql`insert into core.students (id, organization_id, club_id, first_name, last_name, birth_date, category, gender, level, email, active) values (${id}, ${org}, ${clubBySlug.get(student[5])}, ${student[0]}, ${student[1]}, ${index % 4 < 2 ? '1990-03-12' : '2015-07-21'}, ${student[2]}::core.student_category, ${student[3]}::core.student_gender, ${student[4]}::core.student_level, ${`${student[0].toLowerCase()}.${student[1].toLowerCase()}@example.com`}, true) on conflict (id) do nothing`
  }
  const groupData = [
    ['Grupo Iniciación Infantil', 'ambite', 'marta.sanchez@aprendepadel.com', 'child', 'iniciacion', 2, '17:00:00'],
    ['Nivel Medio Adultos', 'pioz', 'diego.martin@aprendepadel.com', 'adult', 'medio', 3, '18:30:00'],
    ['Tecnificación Competición', 'pozuelo-del-rey', 'laura.garcia@aprendepadel.com', 'adult', 'competicion', 4, '20:00:00'],
  ] as const
  const groupIds: string[] = []
  for (const group of groupData) {
    const id = crypto.randomUUID(); groupIds.push(id)
    await sql`insert into classes.groups (id, organization_id, club_id, teacher_id, name, category, level, weekday, start_time) values (${id}, ${org}, ${clubBySlug.get(group[1])}, ${teacherByEmail.get(group[2])}, ${group[0]}, ${group[3]}::core.student_category, ${group[4]}::core.student_level, ${group[5]}, ${group[6]}::time)`
  }
  for (const [index, groupId] of groupIds.entries()) {
    for (const [studentIndex, studentId] of studentIds.entries()) if (studentIndex % 3 === index) await sql`insert into classes.group_members (group_id, student_id) values (${groupId}, ${studentId})`
    for (let offset = -1; offset <= 3; offset++) {
      const starts = new Date(Date.now() + offset * 86400000 + index * 3600000); starts.setHours(17 + index * 2, 0, 0, 0)
      const ends = new Date(starts.getTime() + 3600000); const sessionId = crypto.randomUUID()
      await sql`insert into classes.sessions (id, organization_id, club_id, group_id, teacher_id, starts_at, ends_at, status) select ${sessionId}, ${org}, club_id, ${groupId}, teacher_id, ${starts.toISOString()}, ${ends.toISOString()}, ${offset < 0 ? 'completed' : 'pending'}::classes.session_status from classes.groups where id = ${groupId}`
      const members = await sql`select student_id from classes.group_members where group_id = ${groupId}`
      for (const member of members) { await sql`insert into classes.session_students (session_id, student_id) values (${sessionId}, ${member.student_id})`; if (offset < 0) await sql`insert into classes.attendance (session_id, student_id, status, marked_at) values (${sessionId}, ${member.student_id}, ${'present'}::classes.attendance_status, now())` }
    }
  }
  console.log(JSON.stringify({ organization: org, students: studentIds.length, groups: groupIds.length, sessions: groupIds.length * 5 }))
} finally { await sql.close() }
