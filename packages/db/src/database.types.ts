
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "classes": {
          Tables: {
            "attendance": {
                  Row: {
                    "comment": string | null,"marked_at": string | null,"marked_by": string | null,"session_id": string,"status": Database["classes"]['Enums']["attendance_status"],"student_id": string,"updated_at": string
                  }
                  Insert: {
                    "comment"?: string | null,"marked_at"?: string | null,"marked_by"?: string | null,"session_id": string,"status"?: Database["classes"]['Enums']["attendance_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "comment"?: string | null,"marked_at"?: string | null,"marked_by"?: string | null,"session_id"?: string,"status"?: Database["classes"]['Enums']["attendance_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_session_id_student_id_fkey"
      columns: ["session_id","student_id"]
isOneToOne: true
      referencedRelation: "session_students"
      referencedColumns: ["session_id","student_id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "created_at": string,"ends_on": string | null,"group_id": string,"starts_on": string,"student_id": string
                  }
                  Insert: {
                    "created_at"?: string,"ends_on"?: string | null,"group_id": string,"starts_on"?: string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string | null,"group_id"?: string,"starts_on"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "active": boolean,"capacity": number,"category": Database["core"]['Enums']["student_category"],"club_id": string,"created_at": string,"duration_minutes": number,"ends_on": string | null,"id": string,"level": Database["core"]['Enums']["student_level"],"name": string,"organization_id": string,"start_time": string,"starts_on": string,"teacher_id": string,"updated_at": string,"weekday": number
                  }
                  Insert: {
                    "active"?: boolean,"capacity"?: number,"category": Database["core"]['Enums']["student_category"],"club_id": string,"created_at"?: string,"duration_minutes"?: number,"ends_on"?: string | null,"id"?: string,"level": Database["core"]['Enums']["student_level"],"name": string,"organization_id": string,"start_time": string,"starts_on"?: string,"teacher_id": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "active"?: boolean,"capacity"?: number,"category"?: Database["core"]['Enums']["student_category"],"club_id"?: string,"created_at"?: string,"duration_minutes"?: number,"ends_on"?: string | null,"id"?: string,"level"?: Database["core"]['Enums']["student_level"],"name"?: string,"organization_id"?: string,"start_time"?: string,"starts_on"?: string,"teacher_id"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [

                  ]
                },"session_students": {
                  Row: {
                    "created_at": string,"session_id": string,"student_id": string
                  }
                  Insert: {
                    "created_at"?: string,"session_id": string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"session_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_students_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_students_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "v_billable_sessions"
      referencedColumns: ["session_id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "cancellation_reason": string | null,"category": Database["core"]['Enums']["student_category"],"club_id": string,"court_id": string | null,"created_at": string,"ends_at": string,"group_id": string | null,"id": string,"notes": string | null,"organization_id": string,"starts_at": string,"status": Database["classes"]['Enums']["session_status"],"teacher_id": string,"updated_at": string
                  }
                  Insert: {
                    "cancellation_reason"?: string | null,"category": Database["core"]['Enums']["student_category"],"club_id": string,"court_id"?: string | null,"created_at"?: string,"ends_at": string,"group_id"?: string | null,"id"?: string,"notes"?: string | null,"organization_id": string,"starts_at": string,"status"?: Database["classes"]['Enums']["session_status"],"teacher_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"category"?: Database["core"]['Enums']["student_category"],"club_id"?: string,"court_id"?: string | null,"created_at"?: string,"ends_at"?: string,"group_id"?: string | null,"id"?: string,"notes"?: string | null,"organization_id"?: string,"starts_at"?: string,"status"?: Database["classes"]['Enums']["session_status"],"teacher_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_billable_sessions": {
                  Row: {
                    "category": Database["core"]['Enums']["student_category"] | null,"club_id": string | null,"duration_minutes": number | null,"ends_at": string | null,"enrolled_count": number | null,"organization_id": string | null,"session_id": string | null,"starts_at": string | null,"teacher_id": string | null
                  }
                  Relationships: [

                  ]
                }
          }
          Functions: {
            "create_group":
{ Args: { "p_capacity": number,"p_category": Database["core"]['Enums']["student_category"],"p_club_id": string,"p_duration_minutes": number,"p_ends_on": string | null,"p_level": Database["core"]['Enums']["student_level"],"p_name": string,"p_start_time": string,"p_starts_on": string,"p_student_ids": (string)[] | null,"p_teacher_id": string,"p_weekday": number }; Returns: string
                           },
            "create_session":
{ Args: { "p_category": Database["core"]['Enums']["student_category"],"p_club_id": string,"p_duration_minutes": number,"p_notes"?: string,"p_starts_at": string,"p_student_ids": (string)[],"p_teacher_id": string }; Returns: string
                           },
"generate_sessions":
{ Args: { "range_end": string,"range_start": string,"target_group_id": string }; Returns: number
                           },
"reschedule_session":
{ Args: { "p_duration_minutes": number,"p_local_start": string,"p_notes"?: string,"p_session_id": string }; Returns: undefined
                           },
"set_session_status":
{ Args: { "p_reason"?: string,"p_session_id": string,"p_status": Database["classes"]['Enums']["session_status"] }; Returns: undefined
                           },
"update_group":
{ Args: { "p_capacity": number,"p_duration_minutes": number,"p_ends_on"?: string,"p_group_id": string,"p_level": Database["core"]['Enums']["student_level"],"p_name": string,"p_start_time": string,"p_starts_on": string,"p_student_ids"?: (string)[],"p_teacher_id": string,"p_weekday": number }; Returns: undefined
                           },
"update_session_roster":
{ Args: { "p_session_id": string,"p_student_ids": (string)[] }; Returns: undefined
                           }
          }
          Enums: {
            "attendance_status": "present"|"absent"|"justified","session_status": "pending"|"completed"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"core": {
          Tables: {
            "club_teachers": {
                  Row: {
                    "club_id": string,"created_at": string,"teacher_id": string
                  }
                  Insert: {
                    "club_id": string,"created_at"?: string,"teacher_id": string
                  }
                  Update: {
                    "club_id"?: string,"created_at"?: string,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_teachers_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_teachers_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clubs": {
                  Row: {
                    "active": boolean,"address": string | null,"created_at": string,"id": string,"municipality": string,"name": string,"organization_id": string,"slug": string,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"id"?: string,"municipality": string,"name": string,"organization_id": string,"slug": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"id"?: string,"municipality"?: string,"name"?: string,"organization_id"?: string,"slug"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clubs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"guardians": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"organization_id": string,"phone": string | null,"profile_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"organization_id": string,"phone"?: string | null,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"organization_id"?: string,"phone"?: string | null,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guardians_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guardians_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"module_activations": {
                  Row: {
                    "enabled": boolean,"module_id": string,"organization_id": string,"plan": string,"settings": NonNullable<Json>
                  }
                  Insert: {
                    "enabled"?: boolean,"module_id": string,"organization_id": string,"plan"?: string,"settings"?: NonNullable<Json>
                  }
                  Update: {
                    "enabled"?: boolean,"module_id"?: string,"organization_id"?: string,"plan"?: string,"settings"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_activations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string | null,"full_name": string,"id": string,"organization_id": string,"phone": string | null,"role": Database["core"]['Enums']["app_role"],"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email"?: string | null,"full_name": string,"id": string,"organization_id": string,"phone"?: string | null,"role"?: Database["core"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"organization_id"?: string,"phone"?: string | null,"role"?: Database["core"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"student_accounts": {
                  Row: {
                    "created_at": string,"profile_id": string,"student_id": string
                  }
                  Insert: {
                    "created_at"?: string,"profile_id": string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"profile_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_accounts_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_accounts_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"student_guardians": {
                  Row: {
                    "guardian_id": string,"is_primary": boolean,"relation": string | null,"student_id": string
                  }
                  Insert: {
                    "guardian_id": string,"is_primary"?: boolean,"relation"?: string | null,"student_id": string
                  }
                  Update: {
                    "guardian_id"?: string,"is_primary"?: boolean,"relation"?: string | null,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_guardians_guardian_id_fkey"
      columns: ["guardian_id"]
isOneToOne: false
      referencedRelation: "guardians"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_guardians_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "active": boolean,"birth_date": string,"category": Database["core"]['Enums']["student_category"],"club_id": string,"created_at": string,"email": string | null,"first_name": string,"gender": Database["core"]['Enums']["student_gender"],"id": string,"last_name": string,"level": Database["core"]['Enums']["student_level"],"notes": string | null,"organization_id": string,"phone": string | null,"search_name": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"birth_date": string,"category": Database["core"]['Enums']["student_category"],"club_id": string,"created_at"?: string,"email"?: string | null,"first_name": string,"gender"?: Database["core"]['Enums']["student_gender"],"id"?: string,"last_name": string,"level"?: Database["core"]['Enums']["student_level"],"notes"?: string | null,"organization_id": string,"phone"?: string | null,"search_name"?: string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"birth_date"?: string,"category"?: Database["core"]['Enums']["student_category"],"club_id"?: string,"created_at"?: string,"email"?: string | null,"first_name"?: string,"gender"?: Database["core"]['Enums']["student_gender"],"id"?: string,"last_name"?: string,"level"?: Database["core"]['Enums']["student_level"],"notes"?: string | null,"organization_id"?: string,"phone"?: string | null,"search_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "search_students": {
              Args: {
                "p_search"?: string | null,
                "p_club_id"?: string | null,
                "p_category"?: Database["core"]["Enums"]["student_category"] | null,
                "p_level"?: Database["core"]["Enums"]["student_level"] | null,
                "p_active"?: boolean | null,
                "p_limit"?: number | null,
                "p_offset"?: number | null
              }
              Returns: {
                "id": string,
                "first_name": string,
                "last_name": string,
                "category": Database["core"]["Enums"]["student_category"],
                "level": Database["core"]["Enums"]["student_level"],
                "club_id": string,
                "active": boolean,
                "email": string | null,
                "phone": string | null,
                "total_count": number
              }[]
            },
            "set_student_active": {
              Args: { "p_student_id": string, "p_active": boolean }
              Returns: boolean
            },
            "admin_org_check":
{ Args: { "target_org": string }; Returns: boolean
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["core"]['Enums']["app_role"]
                           },
"current_org":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"module_enabled":
{ Args: { "module_name": string }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "admin"|"teacher"|"student","student_category": "child"|"adult","student_gender": "female"|"male"|"other"|"unspecified","student_level": "iniciacion"|"principiante"|"medio"|"avanzado"|"competicion"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"payments": {
          Tables: {
            "billing_periods": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"id": string,"organization_id": string,"period": string,"status": string
                  }
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"id"?: string,"organization_id": string,"period": string,"status"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"id"?: string,"organization_id"?: string,"period"?: string,"status"?: string
                  }
                  Relationships: [

                  ]
                },"settings": {
                  Row: {
                    "created_at": string,"organization_id": string,"teacher_rate_below_cents": number,"teacher_rate_threshold_cents": number,"teacher_student_threshold": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"organization_id": string,"teacher_rate_below_cents"?: number,"teacher_rate_threshold_cents"?: number,"teacher_student_threshold"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"organization_id"?: string,"teacher_rate_below_cents"?: number,"teacher_rate_threshold_cents"?: number,"teacher_student_threshold"?: number,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"student_charge_lines": {
                  Row: {
                    "amount_cents": number,"charge_id": string,"created_at": string,"id": string,"tariff_id": string | null,"tariff_name": string
                  }
                  Insert: {
                    "amount_cents": number,"charge_id": string,"created_at"?: string,"id"?: string,"tariff_id"?: string | null,"tariff_name": string
                  }
                  Update: {
                    "amount_cents"?: number,"charge_id"?: string,"created_at"?: string,"id"?: string,"tariff_id"?: string | null,"tariff_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_charge_lines_charge_id_fkey"
      columns: ["charge_id"]
isOneToOne: false
      referencedRelation: "student_charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_charge_lines_tariff_id_fkey"
      columns: ["tariff_id"]
isOneToOne: false
      referencedRelation: "tariffs"
      referencedColumns: ["id"]
    }
                  ]
                },"student_charges": {
                  Row: {
                    "calculated_amount_cents": number,"created_at": string,"id": string,"organization_id": string,"override_amount_cents": number | null,"override_reason": string | null,"period": string,"student_id": string,"updated_at": string
                  }
                  Insert: {
                    "calculated_amount_cents"?: number,"created_at"?: string,"id"?: string,"organization_id": string,"override_amount_cents"?: number | null,"override_reason"?: string | null,"period": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "calculated_amount_cents"?: number,"created_at"?: string,"id"?: string,"organization_id"?: string,"override_amount_cents"?: number | null,"override_reason"?: string | null,"period"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"student_tariffs": {
                  Row: {
                    "created_at": string,"ends_on": string | null,"id": string,"starts_on": string,"student_id": string,"tariff_id": string
                  }
                  Insert: {
                    "created_at"?: string,"ends_on"?: string | null,"id"?: string,"starts_on": string,"student_id": string,"tariff_id": string
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string | null,"id"?: string,"starts_on"?: string,"student_id"?: string,"tariff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_tariffs_tariff_id_fkey"
      columns: ["tariff_id"]
isOneToOne: false
      referencedRelation: "tariffs"
      referencedColumns: ["id"]
    }
                  ]
                },"student_transactions": {
                  Row: {
                    "amount_cents": number,"charge_id": string,"created_at": string,"created_by": string,"id": string,"method": Database["payments"]['Enums']["method"],"note": string | null,"paid_at": string
                  }
                  Insert: {
                    "amount_cents": number,"charge_id": string,"created_at"?: string,"created_by": string,"id"?: string,"method": Database["payments"]['Enums']["method"],"note"?: string | null,"paid_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"charge_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"method"?: Database["payments"]['Enums']["method"],"note"?: string | null,"paid_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_transactions_charge_id_fkey"
      columns: ["charge_id"]
isOneToOne: false
      referencedRelation: "student_charges"
      referencedColumns: ["id"]
    }
                  ]
                },"tariffs": {
                  Row: {
                    "active": boolean,"category": Database["core"]['Enums']["student_category"],"created_at": string,"id": string,"monthly_amount_cents": number,"name": string,"organization_id": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"category": Database["core"]['Enums']["student_category"],"created_at"?: string,"id"?: string,"monthly_amount_cents": number,"name": string,"organization_id": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"category"?: Database["core"]['Enums']["student_category"],"created_at"?: string,"id"?: string,"monthly_amount_cents"?: number,"name"?: string,"organization_id"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"teacher_rates": {
                  Row: {
                    "below_threshold_cents": number | null,"created_at": string,"student_threshold": number | null,"teacher_id": string,"threshold_rate_cents": number | null,"updated_at": string
                  }
                  Insert: {
                    "below_threshold_cents"?: number | null,"created_at"?: string,"student_threshold"?: number | null,"teacher_id": string,"threshold_rate_cents"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "below_threshold_cents"?: number | null,"created_at"?: string,"student_threshold"?: number | null,"teacher_id"?: string,"threshold_rate_cents"?: number | null,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"teacher_settlement_lines": {
                  Row: {
                    "amount_cents": number,"created_at": string,"duration_minutes": number,"enrolled_count": number,"id": string,"rate_per_hour_cents": number,"session_id": string,"session_starts_at": string,"settlement_id": string
                  }
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"duration_minutes": number,"enrolled_count": number,"id"?: string,"rate_per_hour_cents": number,"session_id": string,"session_starts_at": string,"settlement_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"duration_minutes"?: number,"enrolled_count"?: number,"id"?: string,"rate_per_hour_cents"?: number,"session_id"?: string,"session_starts_at"?: string,"settlement_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_settlement_lines_settlement_id_fkey"
      columns: ["settlement_id"]
isOneToOne: false
      referencedRelation: "teacher_settlements"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_settlements": {
                  Row: {
                    "calculated_amount_cents": number,"created_at": string,"id": string,"organization_id": string,"override_amount_cents": number | null,"override_reason": string | null,"period": string,"teacher_id": string,"updated_at": string
                  }
                  Insert: {
                    "calculated_amount_cents"?: number,"created_at"?: string,"id"?: string,"organization_id": string,"override_amount_cents"?: number | null,"override_reason"?: string | null,"period": string,"teacher_id": string,"updated_at"?: string
                  }
                  Update: {
                    "calculated_amount_cents"?: number,"created_at"?: string,"id"?: string,"organization_id"?: string,"override_amount_cents"?: number | null,"override_reason"?: string | null,"period"?: string,"teacher_id"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"teacher_transactions": {
                  Row: {
                    "amount_cents": number,"created_at": string,"created_by": string,"id": string,"method": Database["payments"]['Enums']["method"],"note": string | null,"paid_at": string,"settlement_id": string
                  }
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"created_by": string,"id"?: string,"method": Database["payments"]['Enums']["method"],"note"?: string | null,"paid_at"?: string,"settlement_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"created_by"?: string,"id"?: string,"method"?: Database["payments"]['Enums']["method"],"note"?: string | null,"paid_at"?: string,"settlement_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_transactions_settlement_id_fkey"
      columns: ["settlement_id"]
isOneToOne: false
      referencedRelation: "teacher_settlements"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "change_student_tariff":
{ Args: { "p_starts_on": string,"p_student_id": string,"p_tariff_id": string }; Returns: undefined
                           },
            "close_period":
{ Args: { "p_period": string }; Returns: undefined
                           },
"create_student_with_tariff":
{ Args: { "p_birth_date": string,"p_category": Database["core"]['Enums']["student_category"],"p_club_id": string,"p_email": string | null,"p_first_name": string,"p_gender": Database["core"]['Enums']["student_gender"],"p_last_name": string,"p_level": Database["core"]['Enums']["student_level"],"p_phone": string | null,"p_starts_on": string,"p_tariff_id": string }; Returns: string
                           },
"ensure_open_period":
{ Args: { "p_period": string }; Returns: string
                           },
"generate_student_charges":
{ Args: { "p_period": string }; Returns: number
                           },
"generate_period_payments":
{ Args: { "p_period": string }; Returns: undefined
                           },
"generate_teacher_settlements":
{ Args: { "p_period": string }; Returns: number
                           }
          }
          Enums: {
            "method": "cash"|"bizum"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "classes": {
          Enums: {
            "attendance_status": ["present", "absent", "justified"],"session_status": ["pending", "completed", "cancelled"]
          }
        },"core": {
          Enums: {
            "app_role": ["admin", "teacher", "student"],"student_category": ["child", "adult"],"student_gender": ["female", "male", "other", "unspecified"],"student_level": ["iniciacion", "principiante", "medio", "avanzado", "competicion"]
          }
        },"payments": {
          Enums: {
            "method": ["cash", "bizum"]
          }
        },"public": {
          Enums: {

          }
        }
} as const
