export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
type Table<Row extends Record<string, unknown>> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row> }
export type Database = {
  public: { Tables: Record<string, Table<Record<string, unknown>>>; Functions: { generate_sessions: { Args: { target_group_id: string; range_start: string; range_end: string }; Returns: number } } }
  core: { Tables: Record<string, Table<Record<string, unknown>>> }
  classes: { Tables: Record<string, Table<Record<string, unknown>>> }
}
