'use client'

import { useMemo, useRef, useState, useId } from 'react'
import { Search, X } from 'lucide-react'

export type PickableStudent = { id: string; first_name: string; last_name: string }
const normalizeSearchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')

export function StudentPicker({ students, selected, onChange, capacity = 16, emptyText = 'No hay alumnos disponibles.', name = 'studentIds' }: { students: PickableStudent[]; selected: string[]; onChange: (ids: string[]) => void; capacity?: number; emptyText?: string; name?: string }) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const normalized = normalizeSearchText(query.trim())
  const results = useMemo(() => students.filter((student) => normalizeSearchText(`${student.first_name} ${student.last_name}`).includes(normalized)), [students, normalized])
  const selectedIds = useMemo(() => new Set(selected), [selected])
  return <fieldset className="grid min-w-0 gap-2">
    <legend className="flex w-full items-center justify-between text-sm font-semibold text-slate-800"><span>Alumnos</span><span className="tabular-nums text-slate-600" aria-live="polite">{selected.length}/{capacity} inscritos</span></legend>
    <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-400 bg-white px-3 text-slate-600 focus-within:ring-2 focus-within:ring-blue-700"><Search size={16} aria-hidden="true"/><input ref={searchRef} id={`${id}-search`} type="search" autoComplete="off" spellCheck={false} aria-label="Buscar alumno" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar alumno…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-600 outline-none"/><button type="button" aria-label="Limpiar búsqueda" onClick={() => { setQuery(''); searchRef.current?.focus() }} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"><X size={14} aria-hidden="true"/></button></div>
     {selected.map((id) => <input key={id} type="hidden" name={name} value={id}/>)}
     <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-300 p-1" role="group" aria-label="Seleccionar alumnos">{results.map((student) => { const checked = selectedIds.has(student.id); const disabled = !checked && selected.length >= capacity; return <label key={student.id} className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-50'}`}><input type="checkbox" value={student.id} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...selected, student.id] : selected.filter((id) => id !== student.id))} className="accent-blue-700"/><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{student.first_name.slice(0,1)}{student.last_name.slice(0,1)}</span><span className="min-w-0 flex-1 truncate">{student.first_name} {student.last_name}</span></label> })}{results.length === 0 ? <p className="px-3 py-5 text-center text-sm text-slate-600">{query ? 'No hay coincidencias.' : emptyText}</p> : null}</div>
     {selected.length >= capacity ? <p className="text-sm text-slate-700" role="status" aria-live="polite">Aforo completo. Quita una inscripción para añadir a otra persona.</p> : null}
   </fieldset>
}
