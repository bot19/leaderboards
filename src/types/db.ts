export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          is_super_admin: boolean
          default_ladder_id: string | null
        }
        Insert: {
          id: string
          display_name: string
          is_super_admin?: boolean
          default_ladder_id?: string | null
        }
        Update: {
          display_name?: string
          is_super_admin?: boolean
          default_ladder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_default_ladder_id_fkey'
            columns: ['default_ladder_id']
            isOneToOne: false
            referencedRelation: 'ladders'
            referencedColumns: ['id']
          },
        ]
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
          joined_at: string
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
          joined_at?: string
        }
        Update: {
          ladder_id?: string
          user_id?: string | null
          role?: Database['public']['Enums']['ladder_role']
          status?: Database['public']['Enums']['ladder_member_status']
          rating?: number
          rated_match_count?: number
          last_match_at?: string | null
          joined_at?: string
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
          provisional: boolean
          rank: number
        }
        Relationships: []
      }
      inactive_ladder_members: {
        Row: {
          ladder_id: string
          ladder_member_id: string
          display_name: string
          rating: number
          provisional: boolean
          last_active_at: string
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          ladder_member_id: string
          ladder_id: string
          match_id: string
          confirmed_at: string
          rating_before: number
          rating_change: number
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
        Args: { p_name: string; p_make_default?: boolean }
        Returns: string
      }
      set_default_ladder: {
        Args: { p_ladder_id: string }
        Returns: undefined
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
        Args: { p_share_token: string; p_make_default?: boolean }
        Returns: string
      }
      leave_ladder: {
        Args: { p_ladder_id: string }
        Returns: undefined
      }
      remove_ladder_member: {
        Args: { p_ladder_member_id: string }
        Returns: undefined
      }
      reinstate_ladder_member: {
        Args: { p_ladder_member_id: string }
        Returns: undefined
      }
      set_ladder_member_role: {
        Args: {
          p_ladder_member_id: string
          p_role: Database['public']['Enums']['ladder_role']
        }
        Returns: undefined
      }
      delete_ladder: {
        Args: { p_ladder_id: string }
        Returns: undefined
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
      reject_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      void_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      ladder_member_record: {
        Args: { p_ladder_member_id: string }
        Returns: {
          wins: number
          losses: number
          draws: number
          form: string[]
          streak_result: string | null
          streak_length: number
          peak_rating: number | null
          peak_at: string | null
        }[]
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
