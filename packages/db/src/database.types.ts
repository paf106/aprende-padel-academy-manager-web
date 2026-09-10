export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = { core: { Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }> }; classes: { Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }> } }
