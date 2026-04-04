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
      bookings: {
        Row: {
          confirmation_code: string | null
          created_at: string
          created_by: string
          currency: string | null
          details: Json | null
          end_time: string | null
          id: string
          price: number | null
          provider: string | null
          start_time: string | null
          trip_id: string
          type: Database["public"]["Enums"]["booking_type"]
          updated_at: string
        }
        Insert: {
          confirmation_code?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          details?: Json | null
          end_time?: string | null
          id?: string
          price?: number | null
          provider?: string | null
          start_time?: string | null
          trip_id: string
          type: Database["public"]["Enums"]["booking_type"]
          updated_at?: string
        }
        Update: {
          confirmation_code?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          details?: Json | null
          end_time?: string | null
          id?: string
          price?: number | null
          provider?: string | null
          start_time?: string | null
          trip_id?: string
          type?: Database["public"]["Enums"]["booking_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_participants: {
        Row: {
          expense_id: string
          id: string
          profile_id: string
          share_amount: number | null
        }
        Insert: {
          expense_id: string
          id?: string
          profile_id: string
          share_amount?: number | null
        }
        Update: {
          expense_id?: string
          id?: string
          profile_id?: string
          share_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_participants_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          incurred_on: string
          paid_by: string
          split_between: string[]
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          incurred_on?: string
          paid_by: string
          split_between?: string[]
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          incurred_on?: string
          paid_by?: string
          split_between?: string[]
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          progress: number
          started_at: string | null
          status: string
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          progress?: number
          started_at?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          progress?: number
          started_at?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_generation_jobs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          activity_description: string | null
          activity_type: string | null
          all_day: boolean
          booking_id: string | null
          booking_required: boolean
          cost_estimate: string | null
          created_at: string
          created_by: string
          day_number: number | null
          duration_minutes: number | null
          end_time: string | null
          external_link: string | null
          food_suggestion: string | null
          id: string
          is_ai_generated: boolean
          location: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          notes: string | null
          order_index: number | null
          start_time: string | null
          time_slot: string | null
          title: string
          trip_id: string
          trivia: string | null
          type: Database["public"]["Enums"]["itinerary_item_type"]
          updated_at: string
          weather_dependent: boolean
        }
        Insert: {
          activity_description?: string | null
          activity_type?: string | null
          all_day?: boolean
          booking_id?: string | null
          booking_required?: boolean
          cost_estimate?: string | null
          created_at?: string
          created_by: string
          day_number?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          external_link?: string | null
          food_suggestion?: string | null
          id?: string
          is_ai_generated?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          order_index?: number | null
          start_time?: string | null
          time_slot?: string | null
          title: string
          trip_id: string
          trivia?: string | null
          type?: Database["public"]["Enums"]["itinerary_item_type"]
          updated_at?: string
          weather_dependent?: boolean
        }
        Update: {
          activity_description?: string | null
          activity_type?: string | null
          all_day?: boolean
          booking_id?: string | null
          booking_required?: boolean
          cost_estimate?: string | null
          created_at?: string
          created_by?: string
          day_number?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          external_link?: string | null
          food_suggestion?: string | null
          id?: string
          is_ai_generated?: boolean
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          order_index?: number | null
          start_time?: string | null
          time_slot?: string | null
          title?: string
          trip_id?: string
          trivia?: string | null
          type?: Database["public"]["Enums"]["itinerary_item_type"]
          updated_at?: string
          weather_dependent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          from_user_id: string
          id: string
          to_user_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description?: string | null
          from_user_id: string
          id?: string
          to_user_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          from_user_id?: string
          id?: string
          to_user_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allergies: string
          avatar_url: string | null
          created_at: string
          dietary_needs: string[]
          dietary_preferences: Json
          first_name: string | null
          id: string
          interests: Json
          last_name: string | null
          loyalty_programs: Json
          preferences: Json
          preferences_completed: boolean
          updated_at: string
        }
        Insert: {
          allergies?: string
          avatar_url?: string | null
          created_at?: string
          dietary_needs?: string[]
          dietary_preferences?: Json
          first_name?: string | null
          id: string
          interests?: Json
          last_name?: string | null
          loyalty_programs?: Json
          preferences?: Json
          preferences_completed?: boolean
          updated_at?: string
        }
        Update: {
          allergies?: string
          avatar_url?: string | null
          created_at?: string
          dietary_needs?: string[]
          dietary_preferences?: Json
          first_name?: string | null
          id?: string
          interests?: Json
          last_name?: string | null
          loyalty_programs?: Json
          preferences?: Json
          preferences_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      trip_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_code: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["trip_member_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          trip_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_code: string
          invitation_token?: string
          invited_by: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          trip_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_code?: string
          invitation_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invitations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          added_at: string
          id: string
          invitation_status: Database["public"]["Enums"]["invitation_status"]
          invited_by: string | null
          profile_id: string
          role: Database["public"]["Enums"]["trip_member_role"]
          trip_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          invitation_status?: Database["public"]["Enums"]["invitation_status"]
          invited_by?: string | null
          profile_id: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          trip_id: string
        }
        Update: {
          added_at?: string
          id?: string
          invitation_status?: Database["public"]["Enums"]["invitation_status"]
          invited_by?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "trip_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          is_edited: boolean
          message_type: string
          metadata: Json
          reply_to_id: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "trip_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_resolved: boolean
          metadata: Json | null
          title: string
          trip_id: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          metadata?: Json | null
          title: string
          trip_id: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          metadata?: Json | null
          title?: string
          trip_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "trip_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_polls: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_closed: boolean
          is_important: boolean
          message_id: string
          nudge_cooldown_until: string | null
          options: Json
          poll_type: string
          question: string
          settings: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_closed?: boolean
          is_important?: boolean
          message_id: string
          nudge_cooldown_until?: string | null
          options?: Json
          poll_type?: string
          question: string
          settings?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_closed?: boolean
          is_important?: boolean
          message_id?: string
          nudge_cooldown_until?: string | null
          options?: Json
          poll_type?: string
          question?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "trip_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "trip_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          profile_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          profile_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          profile_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_preferences_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_typing_indicators: {
        Row: {
          id: string
          is_typing: boolean
          last_activity: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_typing?: boolean
          last_activity?: string
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_typing?: boolean
          last_activity?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_typing_indicators_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          activity_level: string | null
          ai_itinerary_data: Json | null
          budget: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          destination_main: string | null
          dietary_preferences: Json
          end_date: string | null
          hotel_recommendations: Json
          id: string
          itinerary_generated_at: string | null
          itinerary_status: string | null
          local_travel_info: Json
          must_do: string[]
          must_do_activities: Json
          name: string
          start_date: string | null
          travel_style: string | null
          trip_code: string
          updated_at: string
          vibe: string | null
          visibility: Database["public"]["Enums"]["trip_visibility"]
        }
        Insert: {
          activity_level?: string | null
          ai_itinerary_data?: Json | null
          budget?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          destination_main?: string | null
          dietary_preferences?: Json
          end_date?: string | null
          hotel_recommendations?: Json
          id?: string
          itinerary_generated_at?: string | null
          itinerary_status?: string | null
          local_travel_info?: Json
          must_do?: string[]
          must_do_activities?: Json
          name: string
          start_date?: string | null
          travel_style?: string | null
          trip_code?: string
          updated_at?: string
          vibe?: string | null
          visibility?: Database["public"]["Enums"]["trip_visibility"]
        }
        Update: {
          activity_level?: string | null
          ai_itinerary_data?: Json | null
          budget?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          destination_main?: string | null
          dietary_preferences?: Json
          end_date?: string | null
          hotel_recommendations?: Json
          id?: string
          itinerary_generated_at?: string | null
          itinerary_status?: string | null
          local_travel_info?: Json
          must_do?: string[]
          must_do_activities?: Json
          name?: string
          start_date?: string | null
          travel_style?: string | null
          trip_code?: string
          updated_at?: string
          vibe?: string | null
          visibility?: Database["public"]["Enums"]["trip_visibility"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_trip_invitation: {
        Args: { invitation_token_param: string }
        Returns: Json
      }
      cleanup_typing_indicators: { Args: never; Returns: undefined }
      generate_invitation_code: { Args: never; Returns: string }
      generate_unique_trip_code: { Args: never; Returns: string }
      get_trip_chat_messages: {
        Args: { p_limit?: number; p_offset?: number; p_trip_id: string }
        Returns: Json
      }
      get_trip_dietary_preferences: {
        Args: { trip_id_param: string }
        Returns: Json
      }
      get_trip_member_interests: {
        Args: { trip_id_param: string }
        Returns: Json
      }
      has_trip_role: {
        Args: {
          _trip_id: string
          _user_id: string
          roles: Database["public"]["Enums"]["trip_member_role"][]
        }
        Returns: boolean
      }
      is_trip_member: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_owner: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      join_trip_by_code: { Args: { code_param: string }; Returns: Json }
      update_typing_indicator: {
        Args: { p_is_typing?: boolean; p_trip_id: string }
        Returns: undefined
      }
      validate_hotel_recommendations: { Args: { data: Json }; Returns: boolean }
      validate_local_travel_info: { Args: { data: Json }; Returns: boolean }
    }
    Enums: {
      booking_type: "flight" | "hotel" | "car" | "activity" | "other"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      itinerary_item_type:
        | "flight"
        | "lodging"
        | "transport"
        | "food"
        | "activity"
        | "note"
        | "other"
      trip_member_role: "owner" | "editor" | "viewer"
      trip_visibility: "private" | "link" | "public"
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
    Enums: {
      booking_type: ["flight", "hotel", "car", "activity", "other"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      itinerary_item_type: [
        "flight",
        "lodging",
        "transport",
        "food",
        "activity",
        "note",
        "other",
      ],
      trip_member_role: ["owner", "editor", "viewer"],
      trip_visibility: ["private", "link", "public"],
    },
  },
} as const
