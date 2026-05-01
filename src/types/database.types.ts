export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_context_items: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          is_pinned: boolean
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          is_pinned?: boolean
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_pinned?: boolean
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_context_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_permanent: boolean
          module_key: string
          promoted_to_context: boolean
          status: string
          trigger_key: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_permanent?: boolean
          module_key: string
          promoted_to_context?: boolean
          status?: string
          trigger_key: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_permanent?: boolean
          module_key?: string
          promoted_to_context?: boolean
          status?: string
          trigger_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          feature: string
          id: string
          last_request_at: string | null
          provider: string
          request_count: number
          total_cost_usd: number
          total_tokens_input: number
          total_tokens_output: number
          updated_at: string
          user_id: string
          year_month: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          last_request_at?: string | null
          provider: string
          request_count?: number
          total_cost_usd?: number
          total_tokens_input?: number
          total_tokens_output?: number
          updated_at?: string
          user_id: string
          year_month: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          last_request_at?: string | null
          provider?: string
          request_count?: number
          total_cost_usd?: number
          total_tokens_input?: number
          total_tokens_output?: number
          updated_at?: string
          user_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_snapshots: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          monthly_yield: number | null
          snapshot_date: string
          value: number
          value_in_usd: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          monthly_yield?: number | null
          snapshot_date: string
          value: number
          value_in_usd?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          monthly_yield?: number | null
          snapshot_date?: string
          value?: number
          value_in_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_snapshots_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          annual_rate_pct: number | null
          asset_type: string
          created_at: string
          currency: string
          current_value: number
          household_id: string | null
          id: string
          is_active: boolean
          is_liquid: boolean
          is_shared: boolean
          monthly_yield: number | null
          name: string
          notes: string | null
          quantity: number | null
          ticker_symbol: string | null
          updated_at: string
          user_id: string
          value_in_usd: number | null
        }
        Insert: {
          annual_rate_pct?: number | null
          asset_type: string
          created_at?: string
          currency?: string
          current_value: number
          household_id?: string | null
          id?: string
          is_active?: boolean
          is_liquid?: boolean
          is_shared?: boolean
          monthly_yield?: number | null
          name: string
          notes?: string | null
          quantity?: number | null
          ticker_symbol?: string | null
          updated_at?: string
          user_id: string
          value_in_usd?: number | null
        }
        Update: {
          annual_rate_pct?: number | null
          asset_type?: string
          created_at?: string
          currency?: string
          current_value?: number
          household_id?: string | null
          id?: string
          is_active?: boolean
          is_liquid?: boolean
          is_shared?: boolean
          monthly_yield?: number | null
          name?: string
          notes?: string | null
          quantity?: number | null
          ticker_symbol?: string | null
          updated_at?: string
          user_id?: string
          value_in_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          avg_amount: number | null
          category_id: string
          created_at: string
          expense_type: string
          id: string
          is_active: boolean
          source: string
          suggested_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_amount?: number | null
          category_id: string
          created_at?: string
          expense_type: string
          id?: string
          is_active?: boolean
          source?: string
          suggested_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_amount?: number | null
          category_id?: string
          created_at?: string
          expense_type?: string
          id?: string
          is_active?: boolean
          source?: string
          suggested_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_cents_scores: {
        Row: {
          business_id: string
          control_score: number
          entry_score: number
          id: string
          need_score: number
          notes: string | null
          scale_score: number
          scored_at: string
          time_score: number
          total_score: number | null
        }
        Insert: {
          business_id: string
          control_score: number
          entry_score: number
          id?: string
          need_score: number
          notes?: string | null
          scale_score: number
          scored_at?: string
          time_score: number
          total_score?: number | null
        }
        Update: {
          business_id?: string
          control_score?: number
          entry_score?: number
          id?: string
          need_score?: number
          notes?: string | null
          scale_score?: number
          scored_at?: string
          time_score?: number
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_cents_scores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_model: string
          created_at: string
          currency: string
          id: string
          include_in_fastlane: boolean
          is_passive: boolean
          monthly_net_profit: number
          name: string
          reinvestment_percentage: number
          sector_multiplier: number
          source_idea_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_model: string
          created_at?: string
          currency?: string
          id?: string
          include_in_fastlane?: boolean
          is_passive?: boolean
          monthly_net_profit?: number
          name: string
          reinvestment_percentage?: number
          sector_multiplier?: number
          source_idea_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_model?: string
          created_at?: string
          currency?: string
          id?: string
          include_in_fastlane?: boolean
          is_passive?: boolean
          monthly_net_profit?: number
          name?: string
          reinvestment_percentage?: number
          sector_multiplier?: number
          source_idea_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_businesses_source_idea"
            columns: ["source_idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      freedom_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          is_system_suggested: boolean
          label: string
          projected_date: string | null
          target_days: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_system_suggested?: boolean
          label: string
          projected_date?: string | null
          target_days?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_system_suggested?: boolean
          label?: string
          projected_date?: string | null
          target_days?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freedom_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          display_name: string
          household_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          display_name: string
          household_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          display_name?: string
          household_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          proportional_split: boolean
          shared_expenses: boolean
          shared_incomes: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          proportional_split?: boolean
          shared_expenses?: boolean
          shared_incomes?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          proportional_split?: boolean
          shared_expenses?: boolean
          shared_incomes?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_deep_dives: {
        Row: {
          ai_notes: string | null
          competition_analysis: string | null
          created_at: string
          first_steps: string | null
          id: string
          idea_id: string
          market_analysis: string | null
          required_resources: string | null
          revenue_model: string | null
          time_to_first_revenue: string | null
          updated_at: string
          validation_metrics: string | null
        }
        Insert: {
          ai_notes?: string | null
          competition_analysis?: string | null
          created_at?: string
          first_steps?: string | null
          id?: string
          idea_id: string
          market_analysis?: string | null
          required_resources?: string | null
          revenue_model?: string | null
          time_to_first_revenue?: string | null
          updated_at?: string
          validation_metrics?: string | null
        }
        Update: {
          ai_notes?: string | null
          competition_analysis?: string | null
          created_at?: string
          first_steps?: string | null
          id?: string
          idea_id?: string
          market_analysis?: string | null
          required_resources?: string | null
          revenue_model?: string | null
          time_to_first_revenue?: string | null
          updated_at?: string
          validation_metrics?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_deep_dives_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: true
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_session_messages: {
        Row: {
          content: string
          cost_usd: number
          created_at: string
          id: string
          is_pinned: boolean
          model: string
          phase: string
          pinned_at: string | null
          pinned_by: string | null
          provider: string
          response_time_ms: number | null
          role: string
          sequence_order: number
          session_id: string
          tokens_input: number
          tokens_output: number
          user_id: string
        }
        Insert: {
          content: string
          cost_usd?: number
          created_at?: string
          id?: string
          is_pinned?: boolean
          model: string
          phase: string
          pinned_at?: string | null
          pinned_by?: string | null
          provider: string
          response_time_ms?: number | null
          role: string
          sequence_order: number
          session_id: string
          tokens_input?: number
          tokens_output?: number
          user_id: string
        }
        Update: {
          content?: string
          cost_usd?: number
          created_at?: string
          id?: string
          is_pinned?: boolean
          model?: string
          phase?: string
          pinned_at?: string | null
          pinned_by?: string | null
          provider?: string
          response_time_ms?: number | null
          role?: string
          sequence_order?: number
          session_id?: string
          tokens_input?: number
          tokens_output?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "idea_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_session_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_sessions: {
        Row: {
          completed_at: string | null
          current_phase: string
          entry_point: string
          id: string
          raw_input: string | null
          ready_to_save: boolean
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_phase?: string
          entry_point: string
          id?: string
          raw_input?: string | null
          ready_to_save?: boolean
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_phase?: string
          entry_point?: string
          id?: string
          raw_input?: string | null
          ready_to_save?: boolean
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          business_model: string | null
          cents_preliminary_score: number | null
          cents_score_control: number | null
          cents_score_entry: number | null
          cents_score_need: number | null
          cents_score_scale: number | null
          cents_score_time: number | null
          committed_at: string | null
          concept: string
          created_at: string
          discard_reason: string | null
          discarded_at: string | null
          fastlane_potential: string | null
          id: string
          need_identified: string | null
          promoted_at: string | null
          session_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_model?: string | null
          cents_preliminary_score?: number | null
          cents_score_control?: number | null
          cents_score_entry?: number | null
          cents_score_need?: number | null
          cents_score_scale?: number | null
          cents_score_time?: number | null
          committed_at?: string | null
          concept: string
          created_at?: string
          discard_reason?: string | null
          discarded_at?: string | null
          fastlane_potential?: string | null
          id?: string
          need_identified?: string | null
          promoted_at?: string | null
          session_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_model?: string | null
          cents_preliminary_score?: number | null
          cents_score_control?: number | null
          cents_score_entry?: number | null
          cents_score_need?: number | null
          cents_score_scale?: number | null
          cents_score_time?: number | null
          committed_at?: string | null
          concept?: string
          created_at?: string
          discard_reason?: string | null
          discarded_at?: string | null
          fastlane_potential?: string | null
          id?: string
          need_identified?: string | null
          promoted_at?: string | null
          session_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "idea_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_entries: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string
          currency: string
          deduction_category: string | null
          entry_date: string
          entry_type: string
          hours_worked: number | null
          id: string
          income_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          batch_id?: string | null
          created_at?: string
          currency?: string
          deduction_category?: string | null
          entry_date: string
          entry_type?: string
          hours_worked?: number | null
          id?: string
          income_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          currency?: string
          deduction_category?: string | null
          entry_date?: string
          entry_type?: string
          hours_worked?: number | null
          id?: string
          income_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          contributed_by: string
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          frequency: string | null
          household_id: string | null
          id: string
          label: string
          period_id: string
          type: string
          updated_at: string
          updates_retroactively: boolean
          user_id: string
        }
        Insert: {
          amount: number
          contributed_by: string
          created_at?: string
          currency?: string
          effective_from: string
          effective_to?: string | null
          frequency?: string | null
          household_id?: string | null
          id?: string
          label: string
          period_id: string
          type: string
          updated_at?: string
          updates_retroactively?: boolean
          user_id: string
        }
        Update: {
          amount?: number
          contributed_by?: string
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          frequency?: string | null
          household_id?: string | null
          id?: string
          label?: string
          period_id?: string
          type?: string
          updated_at?: string
          updates_retroactively?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_contributed_by_fkey"
            columns: ["contributed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          balance_in_usd: number | null
          created_at: string
          credit_limit: number | null
          currency: string
          current_balance: number
          household_id: string | null
          id: string
          interest_rate_pct: number | null
          is_active: boolean
          is_shared: boolean
          liability_type: string
          monthly_payment: number | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_in_usd?: number | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance: number
          household_id?: string | null
          id?: string
          interest_rate_pct?: number | null
          is_active?: boolean
          is_shared?: boolean
          liability_type: string
          monthly_payment?: number | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_in_usd?: number | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number
          household_id?: string | null
          id?: string
          interest_rate_pct?: number | null
          is_active?: boolean
          is_shared?: boolean
          liability_type?: string
          monthly_payment?: number | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_unlocks: {
        Row: {
          id: string
          module_key: string
          unlock_trigger: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          module_key: string
          unlock_trigger: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          module_key?: string
          unlock_trigger?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          label: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      progress_score_history: {
        Row: {
          d1_time_decoupling: number
          d2_asset_health: number
          d3_financial_freedom: number
          d4_momentum: number
          id: string
          level: string
          level_percentage: number
          recorded_at: string
          total_score: number | null
          trigger_event: string
          user_id: string
        }
        Insert: {
          d1_time_decoupling: number
          d2_asset_health: number
          d3_financial_freedom: number
          d4_momentum: number
          id?: string
          level: string
          level_percentage: number
          recorded_at?: string
          total_score?: number | null
          trigger_event: string
          user_id: string
        }
        Update: {
          d1_time_decoupling?: number
          d2_asset_health?: number
          d3_financial_freedom?: number
          d4_momentum?: number
          id?: string
          level?: string
          level_percentage?: number
          recorded_at?: string
          total_score?: number | null
          trigger_event?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      real_hours: {
        Row: {
          arrival_home_time: string
          commute_minutes_per_day: number
          contracted_hours_per_week: number
          created_at: string
          extra_hours_per_week: number
          id: string
          mental_load_hours_per_week: number
          period_id: string
          preparation_minutes_per_day: number
          recovery_start_time: string
          updated_at: string
          user_id: string
          working_days_per_week: number
        }
        Insert: {
          arrival_home_time: string
          commute_minutes_per_day?: number
          contracted_hours_per_week: number
          created_at?: string
          extra_hours_per_week?: number
          id?: string
          mental_load_hours_per_week?: number
          period_id: string
          preparation_minutes_per_day?: number
          recovery_start_time: string
          updated_at?: string
          user_id: string
          working_days_per_week: number
        }
        Update: {
          arrival_home_time?: string
          commute_minutes_per_day?: number
          contracted_hours_per_week?: number
          created_at?: string
          extra_hours_per_week?: number
          id?: string
          mental_load_hours_per_week?: number
          period_id?: string
          preparation_minutes_per_day?: number
          recovery_start_time?: string
          updated_at?: string
          user_id?: string
          working_days_per_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "real_hours_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_templates: {
        Row: {
          amount: number
          category_id: string
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          currency: string
          custom_interval_days: number | null
          day_of_month: number
          frequency: string
          household_id: string | null
          id: string
          is_active: boolean
          last_confirmed_at: string | null
          month_of_year: number | null
          name: string
          ping_frequency_days: number | null
          total_debt_amount: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          currency?: string
          custom_interval_days?: number | null
          day_of_month: number
          frequency?: string
          household_id?: string | null
          id?: string
          is_active?: boolean
          last_confirmed_at?: string | null
          month_of_year?: number | null
          name: string
          ping_frequency_days?: number | null
          total_debt_amount?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          currency?: string
          custom_interval_days?: number | null
          day_of_month?: number
          frequency?: string
          household_id?: string | null
          id?: string
          is_active?: boolean
          last_confirmed_at?: string | null
          month_of_year?: number | null
          name?: string
          ping_frequency_days?: number | null
          total_debt_amount?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          applies_to: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_custom: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          applies_to?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_custom?: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          applies_to?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          currency: string
          household_id: string | null
          id: string
          notes: string | null
          period_id: string
          price_per_hour_snapshot: number | null
          recurring_template_id: string | null
          split_percentage: number | null
          split_type: string | null
          status: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          currency?: string
          household_id?: string | null
          id?: string
          notes?: string | null
          period_id: string
          price_per_hour_snapshot?: number | null
          recurring_template_id?: string | null
          split_percentage?: number | null
          split_type?: string | null
          status?: string
          transaction_date: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          currency?: string
          household_id?: string | null
          id?: string
          notes?: string | null
          period_id?: string
          price_per_hour_snapshot?: number | null
          recurring_template_id?: string | null
          split_percentage?: number | null
          split_type?: string | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hint: string
          last_used_at: string | null
          provider: string
          updated_at: string
          user_id: string
          vault_secret_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hint: string
          last_used_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
          vault_secret_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hint?: string
          last_used_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
          vault_secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          ai_recommendation_expiry_hours: number
          anio_referencia: number | null
          base_currency: string
          created_at: string
          hidden_category_ids: string[] | null
          id: string
          precio_hora_referencia: number | null
          timezone: string
          updated_at: string
          user_id: string
          working_days_per_week: number
        }
        Insert: {
          ai_recommendation_expiry_hours?: number
          anio_referencia?: number | null
          base_currency?: string
          created_at?: string
          hidden_category_ids?: string[] | null
          id?: string
          precio_hora_referencia?: number | null
          timezone?: string
          updated_at?: string
          user_id: string
          working_days_per_week?: number
        }
        Update: {
          ai_recommendation_expiry_hours?: number
          anio_referencia?: number | null
          base_currency?: string
          created_at?: string
          hidden_category_ids?: string[] | null
          id?: string
          precio_hora_referencia?: number | null
          timezone?: string
          updated_at?: string
          user_id?: string
          working_days_per_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_recommendations: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
