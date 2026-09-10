"use client";

import { useDeferredValue, useState } from "react";
import { nav, schedule as demoSchedule, schools as demoSchools, type IconName, type Student } from "@/components/dashboard-data";
import { Avatar, Icon } from "@/components/dashboard-primitives";

type DashboardData = { schools: typeof demoSchools; students: Student[]; schedule: typeof demoSchedule; user: { name: string; role: string; initials: string } };

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [active, setActive] = useState("Resumen");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const deferredSearch = useDeferredValue(search);
  const filteredStudents = data.students.filter((student) => {
    const query = deferredSearch.toLowerCase();
    return student.name.toLowerCase().includes(query) || student.school.toLowerCase().includes(query);
  });
  const action = (message: string) => setNotice(message);

  return <div className="app-shell">
    <a className="sr-only" href="#main-content">Saltar al contenido principal</a>
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} aria-label="Navegación principal">
       <div className="brand"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>AP <b>Academy</b></span><button className="close-menu" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><Icon name="close" /></button></div>
      <div className="workspace-label">GESTIÓN DE ACADEMIA</div>
      <nav className="main-nav">
        {nav.map((item) => <button key={item.label} className={`nav-item ${active === item.label ? "active" : ""}`} onClick={() => { setActive(item.label); setMobileOpen(false); }} aria-current={active === item.label ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span>{item.label === "Calendario" ? <span className="nav-count" aria-label="4 clases pendientes">4</span> : null}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="help-card"><span className="help-icon" aria-hidden="true">?</span><strong>¿Necesitas ayuda?</strong><p>Estamos aquí para ayudarte.</p><button onClick={() => action("Soporte preparado para contactar")}>Contactar con soporte <Icon name="arrow" size={14} /></button></div>
      <button className="nav-item settings" onClick={() => setActive("Configuración")}><Icon name="settings" /><span>Configuración</span></button>
       <div className="profile"><Avatar initials={data.user.initials} tone="dark" small /><div><strong>{data.user.name}</strong><span>{data.user.role}</span></div><span className="profile-dots" aria-hidden="true">•••</span></div>
    </aside>
    {mobileOpen ? <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" /> : null}
    <main className="main-content" id="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></button><div className="breadcrumb"><span>Academy</span><b aria-hidden="true">/</b><strong>{active}</strong></div><div className="top-actions"><label className="search-box"><Icon name="search" size={17} /><span className="sr-only">Buscar alumnos o escuelas</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." aria-label="Buscar alumnos o escuelas" autoComplete="off" /></label><button className="icon-btn notification" aria-label="Notificaciones"><Icon name="bell" size={19} /><i aria-hidden="true" /></button><Avatar initials="AR" tone="dark" small /></div></header>
      {notice ? <div className="toast" role="status" aria-live="polite"><Icon name="check" size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Cerrar aviso"><Icon name="close" size={14} /></button></div> : null}
       {active === "Resumen" ? <Dashboard onAction={action} data={data} /> : <PlaceholderPage title={active} onAdd={() => action(`Nuevo registro de ${active.toLowerCase()} preparado`)} search={deferredSearch} students={filteredStudents} />}
    </main>
  </div>;
}

function Dashboard({ onAction, data }: { onAction: (message: string) => void; data: DashboardData }) {
  const [showAll, setShowAll] = useState(false);
  return <div className="page-wrap">
    <section className="page-heading"><div><p className="eyebrow">MARTES, 21 DE JULIO DE 2026</p><h1>Buenos días, Alberto <span aria-hidden="true">✦</span></h1><p className="muted">Aquí tienes lo que está pasando hoy en tu academia.</p></div><button className="primary-btn" onClick={() => onAction("Nueva clase preparada para añadir")}><Icon name="plus" size={17} /> Nueva clase</button></section>
     <section className="metric-grid" aria-label="Resumen de indicadores"><Metric label="Clases de hoy" value={String(data.schedule.length)} detail="sesiones programadas" icon="calendar" tone="lime" trend="En directo" /><Metric label="Alumnos activos" value={String(data.students.length)} detail={`en ${data.schools.length} escuelas`} icon="users" tone="blue" trend="Actualizado" /><Metric label="Ingresos del mes" value="--" detail="Configura la facturación" icon="wallet" tone="orange" trend="Pendiente" /><Metric label="Por liquidar" value="--" detail="Sin liquidaciones" icon="chart" tone="violet" trend="Pendiente" /></section>
    <section className="content-grid" aria-label="Actividad de la academia">
       <div className="panel schedule-panel"><PanelHeading title="Agenda de hoy" subtitle={`${data.schedule.length} sesiones programadas`} actionLabel="Ver calendario" onAction={() => onAction("Calendario abierto")} /><div className="schedule-list" aria-label="Clases programadas">{data.schedule.map((item) => <div className={`schedule-row ${item.done ? "completed" : ""}`} key={item.time + item.title}><time className="time" dateTime={`2026-07-21T${item.time}:00`}>{item.time}</time><div className={`event-mark ${item.color}`} aria-hidden="true" /><div className="event-info"><strong>{item.title}</strong><span>{item.school} <i aria-hidden="true">·</i> {item.teacher}</span></div><div className="event-meta"><span className="people"><Icon name="users" size={14} /> {item.people}</span><span className={`pill ${item.color}`}>{item.type}</span></div><button className={`row-action ${item.done ? "is-done" : ""}`} onClick={() => onAction(item.done ? "La clase ya está terminada" : "Clase marcada como terminada")} aria-label={item.done ? `Clase terminada: ${item.title}` : `Marcar como terminada: ${item.title}`}>{item.done ? <Icon name="check" size={16} /> : <Icon name="arrow" size={15} />}</button></div>)}</div></div>
       <div className="panel schools-panel"><PanelHeading title="Tus escuelas" subtitle="Actividad por sede" /><div className="school-list">{data.schools.map((school) => <div className="school-row" key={school.name}><span className={`school-badge ${school.color}`}>{school.short}</span><div className="school-name"><strong>{school.name}</strong><span>{school.students} alumnos</span></div><div className="school-classes"><strong>{school.classes}</strong><span>clases</span></div><button className="circle-arrow" onClick={() => onAction(`${school.name} seleccionada`)} aria-label={`Ver ${school.name}`}><Icon name="arrow" size={14} /></button></div>)}</div><button className="outline-btn full" onClick={() => onAction("Nueva escuela preparada para añadir")}><Icon name="plus" size={15} /> Añadir escuela</button></div>
    </section>
    <section className="content-grid lower-grid">
       <div className="panel students-panel"><div className="panel-heading"><div><h2>Alumnos recientes</h2><p>Últimas altas en la academia</p></div><button className="text-btn" onClick={() => setShowAll((current) => !current)} aria-expanded={showAll}>{showAll ? "Ver menos" : "Ver todos"} <Icon name="arrow" size={15} /></button></div><StudentTable students={data.students.slice(0, showAll ? data.students.length : 4)} /></div>
      <BillingPanel onAction={onAction} />
    </section>
  </div>;
}

function PanelHeading({ title, subtitle, actionLabel, onAction }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void }) { return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{actionLabel && onAction ? <button className="text-btn" onClick={onAction}>{actionLabel} <Icon name="arrow" size={15} /></button> : null}</div>; }
function Metric({ label, value, detail, icon, tone, trend }: { label: string; value: string; detail: string; icon: IconName; tone: string; trend: string }) { return <div className="metric-card"><div className="metric-top"><span className={`metric-icon ${tone}`}><Icon name={icon} size={19} /></span><span className={`trend ${tone}`}>{trend}</span></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-detail">{detail}</span></div>; }
function StudentTable({ students: rows }: { students: Student[] }) { return <div className="student-table" role="table" aria-label="Alumnos recientes"><div className="table-head" role="row"><span role="columnheader">ALUMNO</span><span role="columnheader">ESCUELA</span><span role="columnheader">NIVEL</span><span role="columnheader">ESTADO</span></div>{rows.map((student) => <div className="student-row" role="row" key={student.name}><div className="student-cell" role="cell"><Avatar initials={student.initials} tone={student.tone} small /><strong>{student.name}</strong></div><span role="cell">{student.school}</span><span role="cell">{student.level}</span><span role="cell" className={`status ${student.tone}`}><i />{student.status}</span></div>)}</div>; }
function BillingPanel({ onAction }: { onAction: (message: string) => void }) { return <div className="panel billing-panel"><PanelHeading title="Resumen de cobros" subtitle="Julio 2026" /><div className="billing-total"><span>Ingresos confirmados</span><strong>4.280 €</strong><div className="progress" role="progressbar" aria-label="Ingresos confirmados" aria-valuenow={78} aria-valuemin={0} aria-valuemax={100}><i style={{ width: "78%" }} /></div><small><b>78%</b> de 5.480 € previstos</small></div><div className="billing-lines"><div><span className="line-dot paid" />Pagados <strong>4.280 €</strong></div><div><span className="line-dot pending" />Pendientes <strong>1.200 €</strong></div></div><button className="outline-btn full" onClick={() => onAction("Detalle de cobros abierto")}>Ver detalle <Icon name="arrow" size={15} /></button></div>; }

function PlaceholderPage({ title, onAdd, search, students: rows }: { title: string; onAdd: () => void; search: string; students: Student[] }) {
  const isStudents = title === "Alumnos";
  const icon: IconName = title === "Calendario" ? "calendar" : title === "Facturación" ? "wallet" : "chart";
  return <div className="page-wrap"><section className="page-heading"><div><p className="eyebrow">GESTIÓN DE ACADEMY</p><h1>{title}</h1><p className="muted">Administra la información de {title.toLowerCase()} de tu academia.</p></div><button className="primary-btn" onClick={onAdd}><Icon name="plus" size={17} /> Añadir {title === "Calendario" ? "clase" : title.slice(0, -1).toLowerCase()}</button></section><div className="panel placeholder-panel">{isStudents ? <><div className="filter-bar"><label className="search-box wide"><Icon name="search" size={17} /><span className="sr-only">Buscar alumnos</span><input placeholder="Buscar por nombre o escuela..." defaultValue={search} aria-label="Buscar por nombre o escuela" autoComplete="off" /></label><button className="outline-btn">Todos los niveles</button><button className="outline-btn">Todas las escuelas</button></div><StudentTable students={rows} /></> : <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={26} /></span><h2>{title} listo para conectar</h2><p>Esta vista forma parte del MVP. Los datos y formularios se conectarán a Supabase en la siguiente capa.</p><button className="primary-btn" onClick={onAdd}><Icon name="plus" size={17} /> Crear primer registro</button></div>}</div></div>;
}
