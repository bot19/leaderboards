export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          is_super_admin: boolean
        }
        Insert: {
          id: string
          display_name: string
          is_super_admin?: boolean
        }
        Update: {
          display_name?: string
          is_super_admin?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_profile: {
        Args: { p_display_name: string }
        Returns: undefined
      }
      update_display_name: {
        Args: { p_display_name: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
