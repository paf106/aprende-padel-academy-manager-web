/** Returns the reasons (in Spanish, shown to the user) why an entity cannot be deleted. Empty means it can. */
export function studentDeletionBlockers(usage: { groups: number; charges: number }) {
  const blockers: string[] = []
  if (usage.groups > 0)
    blockers.push(`Pertenece a ${usage.groups} ${usage.groups === 1 ? 'grupo' : 'grupos'}`)
  if (usage.charges > 0) blockers.push('Tiene cobros registrados')
  return blockers
}

export function teacherDeletionBlockers(usage: { groups: number; sessions: number; settlements: number }) {
  const blockers: string[] = []
  if (usage.groups > 0) blockers.push(`Imparte ${usage.groups} ${usage.groups === 1 ? 'grupo' : 'grupos'}`)
  if (usage.sessions > 0) blockers.push('Tiene clases asignadas')
  if (usage.settlements > 0) blockers.push('Tiene liquidaciones')
  return blockers
}

export function clubDeletionBlockers(usage: { groups: number; students: number; teachers: number }) {
  const blockers: string[] = []
  if (usage.groups > 0) blockers.push(`Tiene ${usage.groups} ${usage.groups === 1 ? 'grupo' : 'grupos'}`)
  if (usage.students > 0)
    blockers.push(`Es la sede habitual de ${usage.students} ${usage.students === 1 ? 'alumno' : 'alumnos'}`)
  if (usage.teachers > 0)
    blockers.push(
      `Tiene ${usage.teachers} ${usage.teachers === 1 ? 'profesor asignado' : 'profesores asignados'}`,
    )
  return blockers
}

export function groupDeletionBlockers(usage: { completedSessions: number }) {
  return usage.completedSessions > 0
    ? [
        `Tiene ${usage.completedSessions} ${usage.completedSessions === 1 ? 'clase terminada' : 'clases terminadas'}`,
      ]
    : []
}
