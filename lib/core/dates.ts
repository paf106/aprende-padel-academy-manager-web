const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()
function getDateTimeFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}:${JSON.stringify(options)}`
  let formatter = dateTimeFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    dateTimeFormatters.set(key, formatter)
  }
  return formatter
}

export function formatInClubTime(value: string, timeZone: string, options?: { timeOnly?: boolean }) {
  return getDateTimeFormatter(
    'es-ES',
    options?.timeOnly
      ? { timeZone, hour: '2-digit', minute: '2-digit' }
      : { timeZone, dateStyle: 'medium', timeStyle: 'short' },
  ).format(new Date(value))
}

export function localDateInTimeZone(value: string | Date, timeZone: string) {
  const parts = getDateTimeFormatter('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function localTimeInTimeZone(value: string | Date, timeZone: string) {
  const parts = getDateTimeFormatter('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

export function timeZoneOffsetLabel(timeZone: string, value: string | Date = new Date()) {
  const parts = getDateTimeFormatter('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  }).formatToParts(new Date(value))
  const offset = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0'
  const match = offset.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) return 'GMT+00'
  const [, sign, hours, minutes = '00'] = match
  return `GMT${sign}${hours.padStart(2, '0')}${minutes === '00' ? '' : `:${minutes}`}`
}

export function localTodayInTimeZone(timeZone: string, now = new Date()) {
  return localDateInTimeZone(now, timeZone)
}

export function calendarMonthGrid(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const rowCount = Math.ceil((offset + daysInMonth) / 7)
  const start = new Date(Date.UTC(year, monthNumber - 1, 1 - offset))
  return Array.from({ length: rowCount * 7 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  })
}

export type CalendarView = 'day' | 'week' | 'month' | 'year'

export function calendarHeadingLabel(date: string, view: CalendarView) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return ''
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const value = new Date(Date.UTC(year, month - 1, day))
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day)
    return ''

  const monthName = (date: Date, long = false) => {
    const name = new Intl.DateTimeFormat('es-ES', {
      month: long ? 'long' : 'short',
      timeZone: 'UTC',
    }).format(date)
    return long ? name : name.replace(/\.$/, '')
  }
  if (view === 'year') return String(year)
  if (view === 'month') return `${monthName(value, true)} de ${year}`
  if (view === 'day') {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value)
  }

  const mondayOffset = (value.getUTCDay() + 6) % 7
  const start = new Date(value)
  start.setUTCDate(value.getUTCDate() - mondayOffset)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${monthName(start, true)} de ${start.getUTCFullYear()}`
  }
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${monthName(start)} – ${monthName(end)} de ${end.getUTCFullYear()}`
  }
  return `${monthName(start)} ${start.getUTCFullYear()} – ${monthName(end)} ${end.getUTCFullYear()}`
}
