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
      games: {
        Row: {
          id: string
          name: string
          draws_allowed: boolean
          largest_side: number
        }
        Insert: {
          id?: string
          name: string
          draws_allowed: boolean
          largest_side: number
        }
        Update: {
          name?: string
          draws_allowed?: boolean
          largest_side?: number
        }
        Relationships: []
      }
      ladders: {
        Row: {
          id: string
          name: string
          game_id: string
          share_token: string
          join_policy: Database['public']['Enums']['join_policy']
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          game_id: string
          share_token: string
          join_policy?: Database['public']['Enums']['join_policy']
          created_at?: string
        }
        Update: {
          name?: string
          game_id?: string
          share_token?: string
          join_policy?: Database['public']['Enums']['join_policy']
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ladders_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }
      ladder_members: {
        Row: {
          id: string
          ladder_id: string
          user_id: string | null
          role: Database['public']['Enums']['ladder_role']
          status: Database['public']['Enums']['ladder_member_status']
          rating: number
          rated_match_count: number
          last_match_at: string | null
        }
        Insert: {
          id?: string
          ladder_id: string
          user_id?: string | null
          role: Database['public']['Enums']['ladder_role']
          status?: Database['public']['Enums']['ladder_member_status']
          rating: number
          rated_match_count?: number
          last_match_at?: string | null
        }
        Update: {
          ladder_id?: string
          user_id?: string | null
          role?: Database['public']['Enums']['ladder_role']
          status?: Database['public']['Enums']['ladder_member_status']
          rating?: number
          rated_match_count?: number
          last_match_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ladder_members_ladder_id_fkey'
            columns: ['ladder_id']
            isOneToOne: false
            referencedRelation: 'ladders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ladder_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      matches: {
        Row: {
          id: string
          ladder_id: string
          status: Database['public']['Enums']['match_status']
          result: Database['public']['Enums']['match_result']
          notes: string | null
          recorded_by: string
          recorded_at: string
          confirmed_at: string | null
          voided_by: string | null
          voided_at: string | null
          void_kind: Database['public']['Enums']['match_void_kind'] | null
        }
        Insert: {
          id?: string
          ladder_id: string
          status?: Database['public']['Enums']['match_status']
          result: Database['public']['Enums']['match_result']
          notes?: string | null
          recorded_by: string
          recorded_at?: string
          confirmed_at?: string | null
          voided_by?: string | null
          voided_at?: string | null
          void_kind?: Database['public']['Enums']['match_void_kind'] | null
        }
        Update: {
          ladder_id?: string
          status?: Database['public']['Enums']['match_status']
          result?: Database['public']['Enums']['match_result']
          notes?: string | null
          recorded_by?: string
          recorded_at?: string
          confirmed_at?: string | null
          voided_by?: string | null
          voided_at?: string | null
          void_kind?: Database['public']['Enums']['match_void_kind'] | null
        }
        Relationships: [
          {
            foreignKeyName: 'matches_ladder_id_fkey'
            columns: ['ladder_id']
            isOneToOne: false
            referencedRelation: 'ladders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_recorded_by_fkey'
            columns: ['recorded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_voided_by_fkey'
            columns: ['voided_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      participants: {
        Row: {
          id: string
          match_id: string
          ladder_member_id: string
          side: Database['public']['Enums']['match_side']
          rating_before: number | null
          rating_change: number | null
        }
        Insert: {
          id?: string
          match_id: string
          ladder_member_id: string
          side: Database['public']['Enums']['match_side']
          rating_before?: number | null
          rating_change?: number | null
        }
        Update: {
          match_id?: string
          ladder_member_id?: string
          side?: Database['public']['Enums']['match_side']
          rating_before?: number | null
          rating_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'participants_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'participants_ladder_member_id_fkey'
            columns: ['ladder_member_id']
            isOneToOne: false
            referencedRelation: 'ladder_members'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      leaderboard: {
        Row: {
          ladder_id: string
          ladder_member_id: string
          display_name: string
          rating: number
        }
        Relationships: []
      }
      my_ladders: {
        Row: {
          id: string
          name: string
          game_name: string
          created_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      create_profile: {
        Args: { p_display_name: string }
        Returns: undefined
      }
      update_display_name: {
        Args: { p_display_name: string }
        Returns: undefined
      }
      create_ladder: {
        Args: { p_name: string }
        Returns: string
      }
      assert_active_ladder_admin: {
        Args: { p_ladder_id: string }
        Returns: undefined
      }
      preview_ladder: {
        Args: { p_share_token: string }
        Returns: {
          name: string
          game_name: string
          member_count: number
        }
      }
      join_ladder: {
        Args: { p_share_token: string }
        Returns: string
      }
      record_match: {
        Args: {
          p_ladder_id: string
          p_side_a: string[]
          p_side_b: string[]
          p_result: Database['public']['Enums']['match_result']
          p_notes?: string | null
        }
        Returns: string
      }
      confirm_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
    }
    Enums: {
      join_policy: 'open'
      ladder_role: 'admin' | 'player'
      ladder_member_status: 'active' | 'left' | 'removed'
      match_status: 'pending' | 'confirmed' | 'voided'
      match_result: 'side_a_won' | 'side_b_won' | 'draw'
      match_side: 'a' | 'b'
      match_void_kind: 'rejected' | 'admin'
    }
    CompositeTypes: Record<string, never>
  }
}
