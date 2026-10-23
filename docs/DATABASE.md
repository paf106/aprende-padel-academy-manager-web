# Esquema de base de datos v2

Postgres (Supabase). Un schema por módulo; `core` contiene identidad, organización y sedes.
Importes en céntimos enteros. Zona horaria `Europe/Madrid`. Todas las tablas llevan
`organization_id` y RLS; las tablas de módulo comprueban además `core.module_enabled('<id>')`.
Los módulos no se enlazan con foreign keys entre sí: `classes` y `payments` solo referencian `core`
(los identificadores de sesión o grupo en `payments` son referencias lógicas, sin FK).

## 1. Core: plataforma, organización y sedes

```mermaid
erDiagram
    organizations ||--o{ organization_modules : activa
    organizations ||--o{ clubs : tiene
    organizations ||--o{ memberships : tiene
    organizations ||--o{ saas_invoices : factura
    clubs ||--o{ courts : tiene
    clubs ||--o{ club_closures : cierra
    profiles ||--o{ memberships : pertenece
    memberships ||--o| teachers : es

    organizations {
        uuid id PK
        text name
        text slug UK
        text timezone "Europe/Madrid"
        text logo_url
        text accent_color
        boolean onboarding_completed
        timestamptz created_at
    }
    organization_modules {
        uuid organization_id PK,FK
        text module_id PK "classes|payments|courts|inventory|tournaments"
        boolean enabled
        date enabled_from
        date enabled_until
    }
    saas_invoices {
        uuid id PK
        uuid organization_id FK
        text period "YYYY-MM"
        int amount_cents
        text status "pending|paid"
        date paid_on
        text notes
    }
    profiles {
        uuid id PK "auth.users.id"
        text full_name
        text email
        boolean is_platform_admin "superadmin"
    }
    memberships {
        uuid id PK
        uuid organization_id FK
        uuid profile_id FK
        text role "admin|teacher|student"
        boolean active
    }
    clubs {
        uuid id PK
        uuid organization_id FK
        text name "sede"
        text city
        text address
        text color
        boolean active
    }
    courts {
        uuid id PK
        uuid organization_id FK
        uuid club_id FK
        text name
        boolean active
    }
    club_closures {
        uuid id PK
        uuid organization_id FK
        uuid club_id FK "null = toda la organización"
        date starts_on
        date ends_on
        text reason "festivo|vacaciones"
    }
    teachers {
        uuid id PK
        uuid organization_id FK
        uuid membership_id FK
        text full_name
        text phone
        boolean active
    }
```

## 2. Core: alumnos y cuentas de cobro

```mermaid
erDiagram
    organizations ||--o{ students : tiene
    clubs ||--o{ student_clubs : acoge
    students ||--o{ student_clubs : asiste
    students ||--o| guardians : "tutor (menores)"
    students ||--o{ student_level_history : evoluciona
    billing_accounts ||--o{ billing_account_members : agrupa
    students ||--o{ billing_account_members : pertenece

    students {
        uuid id PK
        uuid organization_id FK
        uuid membership_id FK "opcional, acceso futuro app"
        text first_name
        text last_name
        date birth_date
        text gender "female|male|other|unspecified"
        text category "adult|child"
        text level "iniciacion|principiante|medio|avanzado|competicion"
        text email
        text phone
        text status "active|inactive"
        date left_on
        timestamptz created_at
    }
    student_clubs {
        uuid student_id PK,FK
        uuid club_id PK,FK
        boolean is_home "sede habitual"
    }
    student_level_history {
        uuid id PK
        uuid student_id FK
        text level
        date changed_on
        text note
    }
    guardians {
        uuid id PK
        uuid student_id FK
        text full_name
        text relationship
        text phone
        text email
        boolean image_consent
        timestamptz gdpr_accepted_at
    }
    billing_accounts {
        uuid id PK
        uuid organization_id FK
        text name "Familia García | Pareja X"
        text kind "individual|couple|family"
        text payment_reference UK
        boolean active
    }
    billing_account_members {
        uuid billing_account_id PK,FK
        uuid student_id PK,FK
        uuid fee_plan_id FK
        date starts_on
        date ends_on
    }
```

## 3. Clases

```mermaid
erDiagram
    groups ||--o{ group_members : incluye
    groups ||--o{ group_schedules : "se repite"
    groups ||--o{ sessions : genera
    sessions ||--o{ session_attendees : inscribe
    sessions ||--o{ session_audit : registra
    class_settings ||--|| organizations_ref : organiza

    class_settings {
        uuid organization_id PK
        int adult_capacity "4"
        int child_capacity "6"
        int default_duration_minutes "60"
    }
    groups {
        uuid id PK
        uuid organization_id FK
        uuid club_id FK
        uuid teacher_id FK
        text name
        text category "adult|child"
        text level
        date starts_on
        date ends_on "opcional"
        int capacity
        boolean active
    }
    group_schedules {
        uuid id PK
        uuid group_id FK
        smallint weekday "1-7"
        time start_time
        smallint duration_minutes "60|90"
    }
    group_members {
        uuid group_id PK,FK
        uuid student_id PK,FK
        date joined_on
        date left_on
    }
    sessions {
        uuid id PK
        uuid organization_id FK
        uuid group_id FK
        uuid club_id FK
        uuid teacher_id FK "quien imparte (sustitución)"
        uuid court_id FK "opcional"
        timestamptz starts_at
        smallint duration_minutes
        text category
        text status "pending|completed|cancelled"
        text cancel_reason "rain|bad_weather|other"
        text cancel_note
        int enrolled_snapshot "alumnos al cerrar"
        boolean attendance_taken
    }
    session_attendees {
        uuid session_id PK,FK
        uuid student_id PK,FK
        text origin "group|drop_in|recovery"
        text attendance "unmarked|present|absent|justified"
    }
    session_audit {
        uuid id PK
        uuid session_id FK
        uuid actor_id
        text action
        jsonb detail
        timestamptz at
    }
    organizations_ref {
        uuid id PK
    }
```

Reglas de BD (triggers/funciones transaccionales):

- Capacidad: `count(session_attendees) <= capacity` por categoría; no se mezclan categorías.
- Sin solapes: un profesor no puede tener dos sesiones que se solapen.
- Sin sesiones en días de `club_closures`; generar sesiones omite esos días.
- `cancel_by_range(club, from, to, reason)`: cancelación masiva por lluvia en una transacción.
- Al marcar `completed` se guarda `enrolled_snapshot` (base del pago al profesor).
- Editar "solo esta" actualiza una sesión; "esta y las siguientes" regenera las futuras del grupo.

## 4. Pagos

```mermaid
erDiagram
    fee_plans ||--o{ billing_charges : "tarifa aplicada"
    billing_accounts_ref ||--o{ billing_periods_charges : cobra
    billing_periods ||--o{ billing_charges : contiene
    billing_charges ||--o{ billing_charge_lines : desglosa
    billing_charges ||--o{ billing_adjustments : ajusta
    billing_charges ||--o{ payments : recibe
    payments ||--o{ payment_allocations : reparte
    billing_periods ||--o{ teacher_settlements : liquida
    teacher_settlements ||--o{ teacher_settlement_lines : detalla
    teacher_pay_rates ||--o{ teacher_settlement_lines : tarifa

    fee_plans {
        uuid id PK
        uuid organization_id FK
        text name "Normal | Pareja"
        int monthly_cents "3500 | 3000"
        text applies_to "individual|couple|family"
        boolean active
    }
    billing_periods {
        uuid id PK
        uuid organization_id FK
        text month "YYYY-MM"
        text status "open|closed"
        timestamptz closed_at
        uuid closed_by
    }
    billing_charges {
        uuid id PK
        uuid organization_id FK
        uuid period_id FK
        uuid billing_account_id "ref lógica a core"
        int due_cents "total a cobrar"
        int credit_applied_cents "saldo a favor"
        text status "pending|partial|paid|none"
    }
    billing_charge_lines {
        uuid id PK
        uuid charge_id FK
        uuid student_id "ref lógica a core"
        uuid fee_plan_id FK
        int base_cents
        smallint scheduled_sessions
        smallint cancelled_sessions
        int prorated_cents
    }
    billing_adjustments {
        uuid id PK
        uuid charge_id FK
        int amount_cents "puede ser negativo"
        text reason "obligatorio"
        uuid created_by
        timestamptz created_at
    }
    payments {
        uuid id PK
        uuid organization_id FK
        uuid charge_id FK
        int amount_cents
        text method "cash|transfer|bizum"
        date paid_on
        text reference
        uuid created_by
        timestamptz created_at
    }
    payment_allocations {
        uuid payment_id PK,FK
        uuid student_id PK
        int amount_cents
    }
    account_credits {
        uuid id PK
        uuid organization_id FK
        uuid billing_account_id
        int amount_cents "saldo a favor"
        uuid source_payment_id FK
        uuid applied_charge_id FK
    }
    teacher_pay_rates {
        uuid id PK
        uuid organization_id FK
        uuid teacher_id "null = organización"
        text category
        smallint threshold "3"
        int below_cents "1200 por hora"
        int at_or_above_cents "1500 por hora"
    }
    teacher_settlements {
        uuid id PK
        uuid organization_id FK
        uuid period_id FK
        uuid teacher_id "ref lógica a core"
        int total_cents
        text status "pending|paid"
        date paid_on
        text method "cash|transfer|bizum"
    }
    teacher_settlement_lines {
        uuid id PK
        uuid settlement_id FK
        uuid session_id "ref lógica a classes"
        smallint duration_minutes
        smallint enrolled
        int hourly_cents
        int amount_cents
    }
    billing_accounts_ref {
        uuid id PK
    }
    billing_periods_charges {
        uuid id PK
    }
```

Reglas de BD:

- `payments`, `billing_adjustments` y `session_audit` son **append-only** (trigger que rechaza `update` y `delete`).
- Un periodo `closed` no admite cambios; las correcciones van como ajuste en el periodo siguiente.
- `generate_charges(period)`: una sola cobranza por cuenta y mes; líneas por miembro con
  `prorated = round(base × (programadas − canceladas) / programadas)`.
- Sobrepago: genera `account_credits`, que se aplica al siguiente cobro.
- Deuda acumulada: vista `account_debt` (suma de saldos pendientes y antigüedad en meses).
- Rentabilidad: vista `group_profitability` = cobrado (proporción por grupo) − `teacher_settlement_lines`.

## 5. Auditoría, importación y vistas de apoyo

```mermaid
erDiagram
    audit_log {
        uuid id PK
        uuid organization_id FK
        uuid actor_id
        text entity "charge|fee_plan|session|payment"
        uuid entity_id
        text action
        jsonb before
        jsonb after
        timestamptz at
    }
    import_batches ||--o{ import_rows : contiene
    import_batches {
        uuid id PK
        uuid organization_id FK
        text kind "students|groups|fee_plans"
        text status "preview|confirmed|failed"
        uuid created_by
    }
    import_rows {
        uuid id PK
        uuid batch_id FK
        int row_number
        jsonb data
        text error
    }
```

Vistas: `free_slots_by_club_slot` (mapa de plazas libres), `admin_tasks` (clases sin lista, cobros
pendientes, grupos sin plaza o infrautilizados, liquidaciones pendientes), `account_debt`,
`group_profitability`.

## 6. Módulos futuros (solo reservado)

```mermaid
erDiagram
    courts ||--o{ court_bookings : reserva
    inventory_items ||--o{ inventory_movements : mueve
    tournaments ||--o{ tournament_entries : inscribe

    court_bookings {
        uuid id PK
        uuid court_id FK
        timestamptz starts_at
        timestamptz ends_at
        text status
    }
    inventory_items {
        uuid id PK
        text name
        int stock
    }
    inventory_movements {
        uuid id PK
        uuid item_id FK
        int delta
    }
    tournaments {
        uuid id PK
        text name
        text format "torneo|liga"
    }
    tournament_entries {
        uuid id PK
        uuid tournament_id FK
        uuid student_id
    }
```

## Seguridad (RLS)

- `core.current_org()` y `core.current_role()` leen `app_metadata`, nunca `user_metadata`.
- Admin: acceso completo a su organización. Superadmin (`profiles.is_platform_admin`): solo
  organizaciones, módulos y facturación SaaS; para soporte accede por una vista de solo lectura registrada.
- Profesor y alumno: políticas definidas para la futura app móvil (profesor ve sus sesiones y
  liquidaciones; alumno ve sus clases y su cuenta de cobro), sin pantallas web en el MVP.
