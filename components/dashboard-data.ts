export type IconName = "grid" | "calendar" | "users" | "map" | "wallet" | "chart" | "settings" | "search" | "bell" | "plus" | "arrow" | "clock" | "check" | "menu" | "close";

export type Student = { name: string; initials: string; level: string; school: string; age: string; status: string; tone: string };

export const schools = [
  { name: "Loranca de Tajuña", short: "LT", color: "lime", students: 64, classes: 18 },
  { name: "Pozuelo del Rey", short: "PR", color: "blue", students: 42, classes: 11 },
  { name: "Ambite", short: "AM", color: "orange", students: 28, classes: 8 },
  { name: "Pioz", short: "PZ", color: "violet", students: 36, classes: 9 },
];

export const students: Student[] = [
  { name: "Javier Sánchez", initials: "JS", level: "Avanzado", school: "Loranca de Tajuña", age: "Adulto", status: "Al día", tone: "green" },
  { name: "Lucía Martín", initials: "LM", level: "Medio", school: "Pozuelo del Rey", age: "Adulta", status: "Pendiente", tone: "amber" },
  { name: "Pablo García", initials: "PG", level: "Iniciación", school: "Ambite", age: "Niño", status: "Al día", tone: "green" },
  { name: "Ana Belén Ruiz", initials: "AB", level: "Competición", school: "Pioz", age: "Adulta", status: "Al día", tone: "green" },
  { name: "Mateo López", initials: "ML", level: "Principiante", school: "Loranca de Tajuña", age: "Niño", status: "Pendiente", tone: "amber" },
];

export const schedule = [
  { time: "16:00", title: "Escuela niños · Nivel medio", school: "Loranca de Tajuña", teacher: "Carlos Martín", people: "6 alumnos", type: "Escuela", color: "lime", done: false },
  { time: "17:00", title: "Grupo adultos · Iniciación", school: "Pozuelo del Rey", teacher: "Marta Sánchez", people: "4 alumnos", type: "Escuela", color: "blue", done: false },
  { time: "18:00", title: "Clase particular", school: "Loranca de Tajuña", teacher: "Carlos Martín", people: "1 alumno", type: "Particular", color: "orange", done: true },
  { time: "19:00", title: "Escuela adultos · Avanzado", school: "Pioz", teacher: "Álvaro Gómez", people: "5 alumnos", type: "Escuela", color: "violet", done: false },
];

export const nav = [
  { label: "Resumen", icon: "grid" as IconName },
  { label: "Calendario", icon: "calendar" as IconName },
  { label: "Alumnos", icon: "users" as IconName },
  { label: "Escuelas", icon: "map" as IconName },
  { label: "Facturación", icon: "wallet" as IconName },
  { label: "Profesores", icon: "chart" as IconName },
];
