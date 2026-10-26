'use client'

import { useSyncExternalStore } from 'react'
import { fullName, teacherName } from '@/lib/demo/data'
import { demoStore } from '@/lib/demo/store'

export function useDemo() {
  const state = useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot, demoStore.getServerSnapshot)
  const studentById = (id: string) => state.students.find((s) => s.id === id)
  const teacherById = (id: string) => state.teachers.find((t) => t.id === id)
  const clubById = (id: string) => state.clubs.find((c) => c.id === id)
  const groupById = (id: string) => state.groups.find((g) => g.id === id)
  return {
    ...state,
    activeClubs: state.clubs.filter((c) => c.active),
    studentById,
    teacherById,
    clubById,
    groupById,
    studentLabel: (id: string) => {
      const student = studentById(id)
      return student ? fullName(student) : ''
    },
    teacherLabel: (id: string) => {
      const teacher = teacherById(id)
      return teacher ? teacherName(teacher) : ''
    },
    clubLabel: (id: string) => clubById(id)?.name ?? '',
    actions: demoStore,
  }
}
