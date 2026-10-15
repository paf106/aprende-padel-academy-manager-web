import { SQL } from 'bun'

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const connection = requiredEnv('SUPABASE_DB_URL')
const secret = requiredEnv('SUPABASE_SECRET_KEY')
const base = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const demoUsers = [
  [requiredEnv('DEMO_ADMIN_EMAIL'), 'Admin Demo', 'admin'],
  [requiredEnv('DEMO_TEACHER_1_EMAIL'), 'Profesor Demo 1', 'teacher'],
  [requiredEnv('DEMO_TEACHER_2_EMAIL'), 'Profesor Demo 2', 'teacher'],
  [requiredEnv('DEMO_TEACHER_3_EMAIL'), 'Profesor Demo 3', 'teacher'],
] as const

const url = new URL(connection)
const sql = new SQL({
  hostname: url.hostname,
  port: Number(url.port || 5432),
  username: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1) || 'postgres',
  tls: true,
  connectionTimeout: 10_000,
})
const org = '00000000-0000-0000-0000-000000000001'
const authHeaders: HeadersInit = { apikey: secret, Authorization: `Bearer ${secret}` }
const demoId = (series: number, index: number) =>
  `f${series.toString().padStart(7, '0')}-0000-4000-8000-${index.toString().padStart(12, '0')}`

async function updateAuthUser(email: string, role: string) {
  let page = 1
  let user: { id: string; email?: string } | undefined
  while (!user) {
    const response = await fetch(`${base}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: authHeaders,
    })
    if (!response.ok) throw new Error(`Could not list Auth users while looking for ${email}`)
    const payload = (await response.json()) as { users?: { id: string; email?: string }[] }
    const users = payload.users ?? []
    user = users.find((item) => item.email?.toLocaleLowerCase('en-US') === email.toLocaleLowerCase('en-US'))
    if (user || users.length < 1000) break
    page += 1
  }
  if (!user) throw new Error(`Auth user not found: ${email}`)
  const updated = await fetch(`${base}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_metadata: { role, organization_id: org } }),
  })
  if (!updated.ok) throw new Error(`Could not update Auth metadata for ${email}`)
  return user.id
}

type ClubRow = { id: string; slug: string }
type TeacherRow = { id: string; email: string | null }

try {
  const authIds = new Map<string, string>()
  for (const [email, , role] of demoUsers) authIds.set(email, await updateAuthUser(email, role))
  for (const [email, name, role] of demoUsers) {
    await sql`insert into core.profiles(id, organization_id, full_name, email, role) values (${authIds.get(email)}, ${org}, ${name}, ${email}, ${role}::core.app_role) on conflict (id) do update set organization_id = excluded.organization_id, full_name = excluded.full_name, email = excluded.email, role = excluded.role`
  }

  const clubs = (await sql`select id, slug from core.clubs where organization_id = ${org}`) as ClubRow[]
  const teachers =
    (await sql`select id, email from core.profiles where organization_id = ${org} and role = ${'teacher'}::core.app_role`) as TeacherRow[]
  const clubBySlug = new Map<string, string>(clubs.map((club) => [club.slug, club.id]))
  const teacherByEmail = new Map<string, string>(
    teachers.flatMap((teacher) => (teacher.email ? [[teacher.email, teacher.id] as const] : [])),
  )
  const studentData = [
    ['Lucía', 'Gómez', 'adult', 'female', 'medio', 'ambite'],
    ['Javier', 'Ruiz', 'adult', 'male', 'principiante', 'ambite'],
    ['Nora', 'Serrano', 'child', 'female', 'iniciacion', 'ambite'],
    ['Hugo', 'Martínez', 'child', 'male', 'iniciacion', 'ambite'],
    ['Alba', 'Navarro', 'adult', 'female', 'avanzado', 'pioz'],
    ['Pablo', 'López', 'adult', 'male', 'medio', 'pioz'],
    ['Emma', 'Castro', 'child', 'female', 'principiante', 'pioz'],
    ['Leo', 'Vega', 'child', 'male', 'iniciacion', 'pioz'],
    ['Sofía', 'Santos', 'adult', 'female', 'competicion', 'pozuelo-del-rey'],
    ['Mario', 'Iglesias', 'adult', 'male', 'avanzado', 'pozuelo-del-rey'],
    ['Valeria', 'Molina', 'child', 'female', 'medio', 'pozuelo-del-rey'],
    ['Daniel', 'Ortega', 'child', 'male', 'principiante', 'pozuelo-del-rey'],
  ] as const

  const studentIds: string[] = []
  for (const [index, student] of studentData.entries()) {
    const clubId = clubBySlug.get(student[5])
    if (!clubId) throw new Error(`Missing demo club for ${student[5]}`)
    const id = demoId(1, index + 1)
    studentIds.push(id)
    await sql`insert into core.students (id, organization_id, club_id, first_name, last_name, birth_date, category, gender, level, email, active) values (${id}, ${org}, ${clubId}, ${student[0]}, ${student[1]}, ${index % 4 < 2 ? '1990-03-12' : '2015-07-21'}, ${student[2]}::core.student_category, ${student[3]}::core.student_gender, ${student[4]}::core.student_level, ${`${student[0].toLowerCase()}.${student[1].toLowerCase()}@example.com`}, true) on conflict (id) do update set club_id = excluded.club_id, first_name = excluded.first_name, last_name = excluded.last_name, birth_date = excluded.birth_date, category = excluded.category, gender = excluded.gender, level = excluded.level, email = excluded.email, active = true`
  }

  const groupData = [
    ['Grupo Iniciación Infantil', 'ambite', demoUsers[1][0], 'child', 'iniciacion', 2, '17:00:00'],
    ['Nivel Medio Adultos', 'pioz', demoUsers[2][0], 'adult', 'medio', 3, '18:30:00'],
    ['Tecnificación Competición', 'pozuelo-del-rey', demoUsers[3][0], 'adult', 'competicion', 4, '20:00:00'],
  ] as const
  const groupIds: string[] = []
  for (const [groupIndex, group] of groupData.entries()) {
    const clubId = clubBySlug.get(group[1])
    const teacherId = teacherByEmail.get(group[2])
    if (!clubId || !teacherId) throw new Error(`Missing demo club or teacher for ${group[0]}`)
    const id = demoId(2, groupIndex + 1)
    groupIds.push(id)
    await sql`insert into classes.groups (id, organization_id, club_id, teacher_id, name, category, level, weekday, start_time) values (${id}, ${org}, ${clubId}, ${teacherId}, ${group[0]}, ${group[3]}::core.student_category, ${group[4]}::core.student_level, ${group[5]}, ${group[6]}::time) on conflict (id) do update set club_id = excluded.club_id, teacher_id = excluded.teacher_id, name = excluded.name, category = excluded.category, level = excluded.level, weekday = excluded.weekday, start_time = excluded.start_time`
  }
  for (const [index, groupId] of groupIds.entries()) {
    const group = groupData[index]
    for (const [studentIndex, student] of studentData.entries()) {
      if (student[5] === group[1] && student[2] === group[3]) {
        await sql`insert into classes.group_members (group_id, student_id) values (${groupId}, ${studentIds[studentIndex]}) on conflict (group_id, student_id) do nothing`
      }
    }
    for (let offset = -1; offset <= 3; offset++) {
      const starts = new Date(Date.now() + offset * 86400000 + index * 3600000)
      starts.setHours(17 + index * 2, 0, 0, 0)
      const ends = new Date(starts.getTime() + 3600000)
      const sessionId = demoId(3, (index + 1) * 10 + offset + 2)
      await sql`insert into classes.sessions (id, organization_id, club_id, group_id, teacher_id, starts_at, ends_at, status) select ${sessionId}, ${org}, club_id, ${groupId}, teacher_id, ${starts.toISOString()}, ${ends.toISOString()}, ${offset < 0 ? 'completed' : 'pending'}::classes.session_status from classes.groups where id = ${groupId} on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = excluded.status`
      const members = await sql`select student_id from classes.group_members where group_id = ${groupId}`
      for (const member of members) {
        await sql`insert into classes.session_students (session_id, student_id) values (${sessionId}, ${member.student_id}) on conflict (session_id, student_id) do nothing`
        if (offset < 0)
          await sql`insert into classes.attendance (session_id, student_id, status, marked_at) values (${sessionId}, ${member.student_id}, ${'present'}::classes.attendance_status, now()) on conflict (session_id, student_id) do update set status = excluded.status, marked_at = excluded.marked_at`
      }
    }
  }
  console.log(
    JSON.stringify({
      organization: org,
      students: studentIds.length,
      groups: groupIds.length,
      sessions: groupIds.length * 5,
    }),
  )
} finally {
  await sql.close()
}
