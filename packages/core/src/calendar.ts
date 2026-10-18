export type TimedCalendarEvent = {
  id: string
  startsAt: string
  endsAt: string
  timeZone?: string
  allDay?: boolean
}
export type CalendarEventPlacement = {
  id: string
  top: number
  height: number
  left: number
  width: number
  hidden: boolean
  allDay?: boolean
  zIndex?: number
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>()

function minuteOfDay(value: string, timeZone?: string) {
  const date = new Date(value)
  if (timeZone) {
    let formatter = timeFormatters.get(timeZone)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
      timeFormatters.set(timeZone, formatter)
    }
    const parts = formatter.formatToParts(date)
    return (
      Number(parts.find((part) => part.type === 'hour')?.value ?? 0) * 60 +
      Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
    )
  }
  return date.getHours() * 60 + date.getMinutes()
}

export function layoutDayEvents<T extends TimedCalendarEvent>(
  events: T[],
  options: {
    startHour?: number
    endHour?: number
    pixelsPerHour?: number
    overlapPercent?: number
    timeZone?: string
    maxColumns?: number
  } = {},
): CalendarEventPlacement[] {
  const start = (options.startHour ?? 0) * 60
  const end = (options.endHour ?? 24) * 60
  const scale = (options.pixelsPerHour ?? 68) / 60
  const overlapPercent = options.overlapPercent ?? 5
  const allDay = events
    .filter((event) => event.allDay)
    .map((event) => ({ id: event.id, top: 0, height: 22, left: 0, width: 100, hidden: false, allDay: true }))
  const sorted = events
    .filter((event) => !event.allDay)
    .map((event) => {
      const timeZone = event.timeZone ?? options.timeZone
      const eventStart = minuteOfDay(event.startsAt, timeZone)
      let eventEnd = minuteOfDay(event.endsAt, timeZone)
      if (eventEnd <= eventStart && new Date(event.endsAt).getTime() > new Date(event.startsAt).getTime())
        eventEnd += 24 * 60
      return { event, start: eventStart, end: eventEnd }
    })
    .filter((item) => item.end > start && item.start < end)
    .sort((a, b) => a.start - b.start || b.end - a.end || a.event.id.localeCompare(b.event.id))
  const result: CalendarEventPlacement[] = []
  let cluster: typeof sorted = []
  let clusterEnd = -1

  const placeCluster = () => {
    if (!cluster.length) return
    const laneEnds: number[] = []
    const assignments: number[] = []
    for (const item of cluster) {
      const lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.start)
      if (lane === -1) {
        assignments.push(laneEnds.length)
        laneEnds.push(item.end)
      } else {
        assignments.push(lane)
        laneEnds[lane] = item.end
      }
    }
    const columns = laneEnds.length
    const columnWidth = 100 / columns
    cluster.forEach((item, index) => {
      const lane = assignments[index]
      const clippedStart = Math.max(item.start, start)
      const clippedEnd = Math.min(item.end, end)
      const left = lane * columnWidth
      result.push({
        id: item.event.id,
        top: (clippedStart - start) * scale,
        height: Math.max(22, (clippedEnd - clippedStart) * scale - 2),
        left,
        width: Math.min(100 - left, columnWidth + (lane < columns - 1 ? overlapPercent : 0)),
        hidden: false,
        zIndex: lane + 1,
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
  { background: '#d3e3fd', border: '#4285f4', foreground: '#17365d' },
  { background: '#eaddf7', border: '#8e63ce', foreground: '#39234f' },
  { background: '#fce8b2', border: '#d79900', foreground: '#513b13' },
  { background: '#cce8e3', border: '#168678', foreground: '#164943' },
  { background: '#f6d4d4', border: '#c64a4a', foreground: '#592929' },
  { background: '#d7e5ad', border: '#69831d', foreground: '#394514' },
  { background: '#d8e1f8', border: '#5269a5', foreground: '#25345e' },
] as const

export function clubCalendarColor(key: number | string) {
  const index =
    typeof key === 'number'
      ? key
      : [...key].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) | 0, 0)
  return clubPalette[((index % clubPalette.length) + clubPalette.length) % clubPalette.length]
}
