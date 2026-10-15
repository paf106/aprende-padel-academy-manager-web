import { notFound } from 'next/navigation'
import { getClassDetailData, getAvailableStudentsForSession } from '../actions'
import { SessionDetail } from './session-detail'

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string; week?: string; view?: string; club?: string; teacher?: string; status?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const detail = await getClassDetailData(id)
  if (!detail) notFound()
  const back = new URLSearchParams()
  for (const key of ['date', 'week', 'view', 'club', 'teacher', 'status'] as const) if (query[key]) back.set(key, query[key]!)
  const backHref = back.size ? `/clases?${back.toString()}` : '/clases'
  return <main><SessionDetail detail={detail} backHref={backHref} loadCandidates={getAvailableStudentsForSession.bind(null, id)}/></main>
}
