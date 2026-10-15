'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check } from 'lucide-react'
import { clubCalendarColor, formatInClubTime, layoutDayEvents, localDateInTimeZone, localTimeInTimeZone } from '@aprende-padel/core'
import { EventPopover, type CalendarEventInfo } from '../../../components/ui/event-popover'

const OPEN_HOUR = 8
const CLOSE_HOUR = 23
const PIXELS_PER_HOUR = 68
const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, index) => OPEN_HOUR + index)
const slots = Array.from({ length: (CLOSE_HOUR - OPEN_HOUR) * 2 }, (_, index) => OPEN_HOUR * 60 + index * 30)
type Event = CalendarEventInfo & { allDay?: boolean }

export function WeekCalendar({ startDate, sessions, clubs, view = 'week' }: { startDate: string; sessions: Event[]; clubs: { id: string; name: string }[]; view?: 'day' | 'week' }) {
  const router = useRouter()
  const search = useSearchParams()
  const selectedDay = parseISO(startDate)
  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 })
  const days = view === 'day' ? [selectedDay] : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const colors = Object.fromEntries(clubs.map((club, index) => [club.id, clubCalendarColor(index)]))
  const now = new Date()
  const today = localDateInTimeZone(now, 'Europe/Madrid')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  function createAt(day: Date, minute: number) { const params = new URLSearchParams(search.toString()); params.set('newDate', format(day, 'yyyy-MM-dd')); params.set('newTime', `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`); router.push(`/clases?${params.toString()}`, { scroll: false }) }
  return <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label={view === 'day' ? 'Agenda del día' : 'Calendario semanal'}>
    {view === 'day' ? <nav className="grid grid-cols-7 border-b border-slate-200 bg-white sm:hidden" aria-label="Días de la semana">{weekDays.map((day) => { const key = format(day, 'yyyy-MM-dd'); const params = new URLSearchParams(search.toString()); params.set('view','day'); params.set('date',key); const active = format(selectedDay,'yyyy-MM-dd') === key; return <Link key={key} aria-current={active ? 'date' : undefined} href={`/clases?${params.toString()}`} className="grid min-h-14 content-center justify-items-center gap-1 text-[10px] capitalize text-slate-500"><span>{format(day,'EEE',{locale:es})}</span><strong className={`grid size-7 place-items-center rounded-full text-xs ${active ? 'bg-blue-700 text-white' : 'text-slate-800'}`}>{format(day,'d')}</strong></Link>})}</nav> : null}
    <div className="max-h-[min(72vh,850px)] overflow-auto overscroll-contain [scrollbar-gutter:stable]"><div className="sticky top-0 z-20 grid grid-cols-[52px_minmax(0,1fr)] border-b border-slate-200 bg-white">
      <div className="border-r border-slate-200"/><div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7 max-sm:min-w-[820px]'}`}>{days.map((day) => { const key = format(day,'yyyy-MM-dd'); return <div key={key} className="flex min-h-[68px] items-center justify-center gap-2 border-r border-slate-200 text-slate-500 last:border-r-0"><span className="text-[11px] uppercase tracking-wide">{format(day,'EEE',{locale:es})}</span><strong className={`grid size-9 place-items-center rounded-full text-base font-medium ${key === today ? 'bg-blue-700 text-white' : 'text-slate-800'}`}>{format(day,'d')}</strong></div>})}</div>
    </div>
    {sessions.some((session) => session.allDay) ? <div className="grid grid-cols-[52px_minmax(0,1fr)] border-b border-slate-200"><span className="px-1 py-2 text-[9px] text-slate-500">Hora local</span><div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7 max-sm:min-w-[820px]'}`}>{days.map((day) => { const key = format(day,'yyyy-MM-dd'); const events = sessions.filter((event) => event.allDay && localDateInTimeZone(event.starts_at,event.club?.timezone??'Europe/Madrid') === key); return <div key={key} className="grid min-h-8 content-start gap-1 border-r border-slate-200 p-1 last:border-r-0">{events.map((event) => <button type="button" key={event.id} data-session-id={event.id} onClick={() => setSelectedEvent(event)} className="truncate rounded-md px-2 py-1 text-left text-[10px] font-medium text-white" style={{backgroundColor:colors[event.club_id]?.border??'#3b82f6'}}>{event.club?.name??'Clase'} · {event.studentCount}/{event.capacity}</button>)}</div>})}</div></div> : null}
    <div className="grid grid-cols-[52px_minmax(0,1fr)]">
      <div className="relative border-r border-slate-200 bg-white" style={{height:(CLOSE_HOUR-OPEN_HOUR)*PIXELS_PER_HOUR}}>{hours.map((hour)=><span key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-slate-500" style={{top:(hour-OPEN_HOUR)*PIXELS_PER_HOUR}}>{String(hour).padStart(2,'0')}:00</span>)}</div>
      <div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7 max-sm:min-w-[820px]'}`}>{days.map((day)=>{
        const key=format(day,'yyyy-MM-dd')
        const daily=sessions.filter((event)=>!event.allDay && localDateInTimeZone(event.starts_at,event.club?.timezone??'Europe/Madrid')===key)
        const positions=layoutDayEvents(daily.map((event)=>({id:event.id,startsAt:event.starts_at,endsAt:event.ends_at,timeZone:event.club?.timezone??'Europe/Madrid',allDay:event.allDay})),{startHour:OPEN_HOUR,endHour:CLOSE_HOUR,pixelsPerHour:PIXELS_PER_HOUR,maxColumns:3})
        const allDayPositions=positions.filter((position)=>position.allDay)
        const timedPositions=positions.filter((position)=>!position.allDay)
        const byId=new Map(timedPositions.map((position)=>[position.id,position]))
        const overflow=new Map<number,number>()
        timedPositions.filter((position)=>position.hidden).forEach((position)=>{const half=Math.round(position.top/(PIXELS_PER_HOUR/2));overflow.set(half,(overflow.get(half)??0)+1)})
        const current=localTimeInTimeZone(now,'Europe/Madrid')
        return <div key={key} className={`relative border-r border-slate-200 last:border-r-0 ${key===today?'bg-blue-50/20':''}`} style={{height:(CLOSE_HOUR-OPEN_HOUR)*PIXELS_PER_HOUR,backgroundImage:'repeating-linear-gradient(to bottom, transparent 0, transparent 67px, #e2e8f0 67px, #e2e8f0 68px)'}}>
          {slots.map((minute)=><button key={minute} type="button" aria-label={`Crear clase ${format(day,'d MMMM',{locale:es})} ${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`} className="absolute inset-x-0 z-0 h-[34px] border-b border-dashed border-slate-100 bg-transparent hover:bg-blue-50/70" style={{top:((minute-OPEN_HOUR*60)/60)*PIXELS_PER_HOUR}} onClick={()=>createAt(day,minute)}/>)}
          {key===today&&current>=OPEN_HOUR*60&&current<CLOSE_HOUR*60?<div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-rose-600" style={{top:(current-OPEN_HOUR*60)*PIXELS_PER_HOUR}}><span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-rose-600"/></div>:null}
          {daily.map((event)=>{const placement=byId.get(event.id);if(!placement||placement.hidden)return null;const color=colors[event.club_id]??clubCalendarColor(0);const start=formatInClubTime(event.starts_at,event.club?.timezone??'Europe/Madrid',{timeOnly:true});const end=formatInClubTime(event.ends_at,event.club?.timezone??'Europe/Madrid',{timeOnly:true});return <button key={event.id} data-session-id={event.id} type="button" onClick={()=>setSelectedEvent(event)} className={`calendar-event absolute z-10 grid min-w-0 cursor-pointer content-start gap-1 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-left text-[11px] leading-tight shadow-sm outline-none transition-shadow hover:z-20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-700 ${event.status==='cancelled'?'opacity-50 line-through':event.status==='completed'?'opacity-70':''}`} data-status={event.status} style={{top:placement.top,height:placement.height,left:`calc(${placement.left}% + 3px)`,width:`calc(${placement.width}% - 6px)`,backgroundColor:color.background,borderLeftColor:color.border,color:color.foreground}}><span className="flex min-w-0 items-center justify-between gap-1"><strong className="truncate">{event.club?.name??'Club'}</strong><span className="shrink-0 tabular-nums">{event.studentCount}/{event.capacity}</span></span><span className="tabular-nums">{start} – {end}</span>{placement.height>72?<span className="truncate opacity-80">{event.teacher?.full_name??'Profesor'}</span>:null}{event.status==='completed'?<Check className="absolute right-1 top-1" size={13} aria-label="Terminada"/>:null}</button>})}
          {[...overflow.entries()].map(([half,count])=>{const params=new URLSearchParams(search.toString());params.set('view','day');params.set('date',key);return <button key={half} type="button" className="absolute z-20 min-h-5 rounded-md border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-800" style={{top:half*PIXELS_PER_HOUR/2,left:3,right:3}} onClick={()=>router.push(`/clases?${params.toString()}`,{scroll:false})}>+{count} más</button>})}
        </div>
      })}</div>
    </div></div>
    <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500"><span className="text-base leading-none">＋</span> Selecciona un hueco para crear una clase</div>
    {selectedEvent?<EventPopover event={selectedEvent} color={colors[selectedEvent.club_id]??clubCalendarColor(0)} onClose={()=>setSelectedEvent(null)} href={`/clases/${selectedEvent.id}`} />:null}
  </div>
}
