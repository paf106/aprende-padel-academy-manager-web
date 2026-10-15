export type TimedCalendarEvent = { id: string; startsAt: string; endsAt: string; timeZone?: string; allDay?: boolean }
export type CalendarEventPlacement = { id: string; top: number; height: number; left: number; width: number; hidden: boolean; allDay?: boolean }

function minuteOfDay(value: string, timeZone?: string) {
  const date = new Date(value)
  if (timeZone) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
    return Number(parts.find((part) => part.type === 'hour')?.value ?? 0) * 60 + Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  }
  return date.getHours() * 60 + date.getMinutes()
}

export function layoutDayEvents<T extends TimedCalendarEvent>(events: T[], options: { startHour?: number; endHour?: number; pixelsPerHour?: number; maxColumns?: number; timeZone?: string } = {}): CalendarEventPlacement[] {
  const start = (options.startHour ?? 8) * 60
  const end = (options.endHour ?? 23) * 60
  const scale = (options.pixelsPerHour ?? 64) / 60
  const maxColumns = options.maxColumns ?? 3
  const allDay = events.filter((event) => event.allDay).map((event) => ({ id: event.id, top: 0, height: 22, left: 0, width: 100, hidden: false, allDay: true }))
  const sorted = events.map((event) => ({ event, start: minuteOfDay(event.startsAt, event.timeZone ?? options.timeZone), end: minuteOfDay(event.endsAt, event.timeZone ?? options.timeZone) })).filter((item) => item.end > start && item.start < end).sort((a, b) => a.start - b.start || a.end - b.end)
  const result: CalendarEventPlacement[] = []
  let cluster: typeof sorted = []
  let clusterEnd = -1

  const placeCluster = () => {
    if (!cluster.length) return
    const lanes: number[] = []
    const assignments: number[] = []
    for (const item of cluster) {
      let lane = lanes.findIndex((laneEnd) => laneEnd <= item.start)
      if (lane === -1) { lane = lanes.length; lanes.push(item.end) }
      else lanes[lane] = item.end
      assignments.push(lane)
    }
    const columns = Math.min(lanes.length, maxColumns)
    cluster.forEach((item, index) => {
      const lane = assignments[index]
      const clippedStart = Math.max(item.start, start)
      const clippedEnd = Math.min(item.end, end)
      result.push({
        id: item.event.id,
        top: (clippedStart - start) * scale,
        height: Math.max(22, (clippedEnd - clippedStart) * scale - 2),
        left: (Math.min(lane, maxColumns - 1) / columns) * 100,
        width: 100 / columns,
        hidden: lane >= maxColumns,
      })
    })
    cluster = []
    clusterEnd = -1
  }

  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) placeCluster()
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  placeCluster()
  return [...allDay, ...result]
}

const clubPalette = [
  { background: '#d2e3fc', border: '#5b8def', foreground: '#202124' },
  { background: '#e8d7f1', border: '#9a72b8', foreground: '#202124' },
  { background: '#fce8b2', border: '#d59b23', foreground: '#202124' },
  { background: '#cce8e3', border: '#459b88', foreground: '#202124' },
  { background: '#f6d4d4', border: '#d66b6b', foreground: '#202124' },
  { background: '#d7e5ad', border: '#88a536', foreground: '#202124' },
] as const

export function clubCalendarColor(index: number) {
  return clubPalette[((index % clubPalette.length) + clubPalette.length) % clubPalette.length]
}
