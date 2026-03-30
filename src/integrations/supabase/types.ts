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
    PostgrestVersion: "13.0.4"
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
          created_at: string
          currency: string
          description: string | null
          id: string
          incurred_on: string
          paid_by: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          incurred_on?: string
          paid_by: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          incurred_on?: string
          paid_by?: string
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
          created_at: string | null
          error_message: string | null
          id: string
          request_payload: Json
          response_data: Json | null
          started_at: string | null
          status: string
          trip_id: string
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_payload: Json
          response_data?: Json | null
          started_at?: string | null
          status?: string
          trip_id: string
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_payload?: Json
          response_data?: Json | null
          started_at?: string | null
          status?: string
          trip_id?: string
          updated_at?: string | null
          webhook_url?: string
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
          all_day: boolean
          booking_id: string | null
          created_at: string
          created_by: string
          day_number: number | null
          end_time: string | null
          external_link: string | null
          food_suggestion: string | null
          id: string
          is_ai_generated: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          notes: string | null
          order_index: number | null
          start_time: string | null
          time_slot: string | null
          title: string
          trivia: string | null
          trip_id: string
          type: Database["public"]["Enums"]["itinerary_item_type"]
          updated_at: string
        }
        Insert: {
          activity_description?: string | null
          all_day?: boolean
          booking_id?: string | null
          created_at?: string
          created_by: string
          day_number?: number | null
          end_time?: string | null
          external_link?: string | null
          food_suggestion?: string | null
          id?: string
          is_ai_generated?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          order_index?: number | null
          start_time?: string | null
          time_slot?: string | null
          title: string
          trivia?: string | null
          trip_id: string
          type?: Database["public"]["Enums"]["itinerary_item_type"]
          updated_at?: string
        }
        Update: {
          activity_description?: string | null
          all_day?: boolean
          booking_id?: string | null
          created_at?: string
          created_by?: string
          day_number?: number | null
          end_time?: string | null
          external_link?: string | null
          food_suggestion?: string | null
          id?: string
          is_ai_generated?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          order_index?: number | null
          start_time?: string | null
          time_slot?: string | null
          title?: string
          trivia?: string | null
          trip_id?: string
          type?: Database["public"]["Enums"]["itinerary_item_type"]
          updated_at?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      trip_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "trip_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "trip_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trip_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "trip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          is_pinned: boolean
          metadata: Json
          post_type: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          metadata?: Json
          post_type?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          metadata?: Json
          post_type?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_posts_trip_id_fkey"
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
          profile_id: string
          role: Database["public"]["Enums"]["trip_member_role"]
          trip_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          invitation_status?: Database["public"]["Enums"]["invitation_status"]
          profile_id: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          trip_id: string
        }
        Update: {
          added_at?: string
          id?: string
          invitation_status?: Database["public"]["Enums"]["invitation_status"]
          profile_id?: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          trip_id?: string
        }
        Relationships: [
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
      trips: {
        Row: {
          ai_itinerary_data: Json | null
          budget: Database["public"]["Enums"]["budget_enum"] | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          destination_main: string | null
          end_date: string | null
          hotel_recommendations: Json | null
          id: string
          itinerary_generated_at: string | null
          itinerary_status: string | null
          local_travel_info: Json | null
          must_do: string[] | null
          name: string
          start_date: string | null
          travel_style: Database["public"]["Enums"]["travel_style_enum"] | null
          updated_at: string
          vibe: Database["public"]["Enums"]["trip_vibe_enum"] | null
          visibility: Database["public"]["Enums"]["trip_visibility"]
trip_code?: string
        }
        Insert: {
          ai_itinerary_data?: Json | null
          budget?: Database["public"]["Enums"]["budget_enum"] | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          destination_main?: string | null
          end_date?: string | null
          hotel_recommendations?: Json | null
          id?: string
          itinerary_generated_at?: string | null
          itinerary_status?: string | null
          local_travel_info?: Json | null
          must_do?: string[] | null
          name: string
          start_date?: string | null
          travel_style?: Database["public"]["Enums"]["travel_style_enum"] | null
          updated_at?: string
          vibe?: Database["public"]["Enums"]["trip_vibe_enum"] | null
          visibility?: Database["public"]["Enums"]["trip_visibility"]
          trip_code?: string
        }
        Update: {
          ai_itinerary_data?: Json | null
          budget?: Database["public"]["Enums"]["budget_enum"] | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          destination_main?: string | null
          end_date?: string | null
          hotel_recommendations?: Json | null
          id?: string
          itinerary_generated_at?: string | null
          itinerary_status?: string | null
          local_travel_info?: Json | null
          must_do?: string[] | null
          name?: string
          start_date?: string | null
          travel_style?: Database["public"]["Enums"]["travel_style_enum"] | null
          updated_at?: string
          vibe?: Database["public"]["Enums"]["trip_vibe_enum"] | null
          visibility?: Database["public"]["Enums"]["trip_visibility"]
          trip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
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
    }
    Enums: {
      booking_type: "flight" | "hotel" | "car" | "activity" | "other"
      budget_enum: "budget" | "mid_range" | "luxury" | "ultra_luxury"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      itinerary_item_type:
        | "flight"
        | "lodging"
        | "transport"
        | "food"
        | "activity"
        | "note"
        | "other"
      travel_style_enum: "solo" | "couple" | "family" | "friends" | "business"
      trip_member_role: "owner" | "editor" | "viewer"
      trip_vibe_enum:
        | "relaxed"
        | "adventurous"
        | "cultural"
        | "foodie"
        | "nightlife"
        | "nature"
        | "luxury"
        | "budget"
        | "romantic"
        | "family_friendly"
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
      budget_enum: ["budget", "mid_range", "luxury", "ultra_luxury"],
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
      travel_style_enum: ["solo", "couple", "family", "friends", "business"],
      trip_member_role: ["owner", "editor", "viewer"],
      trip_vibe_enum: [
        "relaxed",
        "adventurous",
        "cultural",
        "foodie",
        "nightlife",
        "nature",
        "luxury",
        "budget",
        "romantic",
        "family_friendly",
      ],
      trip_visibility: ["private", "link", "public"],
    },
  },
} as const