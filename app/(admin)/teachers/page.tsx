import { localTodayInTimeZone } from '@/lib/core/dates'
import { formatMoney } from '@/lib/core/money'
import { BentoCard, BentoGrid, Stat } from '@/components/ds/card'
import { PageContainer, PageHeader } from '@/components/ds/page-header'
import { buildSettlements } from '@/lib/demo/billing'
import { clubById, groups, teachers } from '@/lib/demo/data'

export const metadata = { title: 'Profesores | AprendePadel' }

export default function TeachersPage() {
  const today = localTodayInTimeZone('Europe/Madrid')
  const settlements = buildSettlements(today)
  return (
    <PageContainer>
      <PageHeader title="Profesores" description="Clases impartidas y liquidación del mes" />
      <BentoGrid>
        {teachers.map((teacher) => {
          const settlement = settlements.find((s) => s.teacherId === teacher.id)
          const mine = groups.filter((g) => g.teacherId === teacher.id)
          return (
            <BentoCard key={teacher.id} span="md" title={teacher.phone}>
              <h2 className="text-lg font-semibold">{teacher.name}</h2>
              <Stat
                value={formatMoney(settlement?.totalCents ?? 0)}
                label="A liquidar este mes"
                hint={`${settlement?.sessions ?? 0} clases · ${settlement?.hours ?? 0} h`}
              />
              <ul className="flex flex-wrap gap-1.5">
                {mine.map((g) => (
                  <li key={g.id} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {g.name} · {clubById(g.clubId)?.name}
                  </li>
                ))}
              </ul>
            </BentoCard>
          )
        })}
      </BentoGrid>
    </PageContainer>
  )
}
