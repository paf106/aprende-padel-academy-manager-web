import { createClient } from "@/lib/supabase/server";
import { demoSchedule, demoSchools, demoStudents } from "@/lib/dashboard-data";
import DashboardClient from "@/components/dashboard-client";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function relationName(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value;
  return (relation as { name?: string } | null | undefined)?.name;
}

function relationFullName(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value;
  return (relation as { full_name?: string } | null | undefined)?.full_name;
}

export default async function Home() {
  const fallback = { schools: demoSchools, students: demoStudents, schedule: demoSchedule, user: { name: "Administrador", role: "Administrador", initials: "AD" } };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return <DashboardClient data={fallback} />;

  const supabase = await createClient();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("full_name, role").maybeSingle(),
  ]);
  if (!userData.user) return <DashboardClient data={fallback} />;

  const [{ data: schools }, { data: students }, { data: sessions }] = await Promise.all([
    supabase.from("schools").select("id, name").eq("active", true).order("name"),
    supabase.from("students").select("id, first_name, last_name, level, school:schools(name)").eq("active", true).order("created_at", { ascending: false }).limit(20),
    supabase.from("sessions").select("id, starts_at, type, status, school:schools(name), teacher:profiles(full_name)").gte("starts_at", now.toISOString()).lt("starts_at", tomorrow.toISOString()).order("starts_at").limit(20),
  ]);

  const data = {
    schools: (schools ?? []).map((school, index) => ({ name: school.name, short: initials(school.name), color: ["lime", "blue", "orange", "violet"][index % 4], students: (students ?? []).filter((student) => relationName(student.school) === school.name).length, classes: 0 })),
    students: (students ?? []).map((student, index) => { const school = relationName(student.school); return { name: `${student.first_name} ${student.last_name}`, initials: initials(`${student.first_name} ${student.last_name}`), level: student.level, school: school ?? "Sin escuela", age: "", status: "Activo", tone: index % 3 === 1 ? "amber" : "green" }; }),
    schedule: (sessions ?? []).map((session, index) => { const start = new Date(session.starts_at); const school = relationName(session.school); const teacher = relationFullName(session.teacher); return { time: start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }), title: session.type === "escuela" ? "Clase de escuela" : `Clase ${session.type}`, school: school ?? "Sin escuela", teacher: teacher ?? "Sin profesor", people: "Sesión", type: session.type[0].toUpperCase() + session.type.slice(1), color: ["lime", "blue", "orange", "violet"][index % 4], done: session.status === "completed" }; }),
    user: { name: profile?.full_name ?? userData.user.email?.split("@")[0] ?? "Administrador", role: profile?.role === "teacher" ? "Profesor" : "Administrador", initials: initials(profile?.full_name ?? "Administrador") },
  };

  return <DashboardClient data={data} />;
}
