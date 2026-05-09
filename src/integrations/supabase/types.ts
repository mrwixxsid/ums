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
      academic_semesters: {
        Row: {
          created_at: string
          final_exam_end: string | null
          final_exam_start: string | null
          id: string
          is_active: boolean
          mid_exam_end: string | null
          mid_exam_start: string | null
          name: string
          next_semester_start: string | null
          result_publish_date: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          final_exam_end?: string | null
          final_exam_start?: string | null
          id?: string
          is_active?: boolean
          mid_exam_end?: string | null
          mid_exam_start?: string | null
          name: string
          next_semester_start?: string | null
          result_publish_date?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          final_exam_end?: string | null
          final_exam_start?: string | null
          id?: string
          is_active?: boolean
          mid_exam_end?: string | null
          mid_exam_start?: string | null
          name?: string
          next_semester_start?: string | null
          result_publish_date?: string | null
          start_date?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          assessment_date: string | null
          course_id: string
          created_at: string
          id: string
          marks_obtained: number | null
          student_id: string
          teacher_id: string
          title: string
          total_marks: number | null
        }
        Insert: {
          assessment_date?: string | null
          course_id: string
          created_at?: string
          id?: string
          marks_obtained?: number | null
          student_id: string
          teacher_id: string
          title: string
          total_marks?: number | null
        }
        Update: {
          assessment_date?: string | null
          course_id?: string
          created_at?: string
          id?: string
          marks_obtained?: number | null
          student_id?: string
          teacher_id?: string
          title?: string
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          id: string
          marked_at: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          marked_at?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          marked_at?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          admission_session: string
          batch_name: string
          created_at: string
          department_id: string
          id: string
          is_graduated: boolean
          semester: number
          starting_roll: number
          student_count: number | null
          year: number
        }
        Insert: {
          admission_session?: string
          batch_name: string
          created_at?: string
          department_id: string
          id?: string
          is_graduated?: boolean
          semester: number
          starting_roll: number
          student_count?: number | null
          year: number
        }
        Update: {
          admission_session?: string
          batch_name?: string
          created_at?: string
          department_id?: string
          id?: string
          is_graduated?: boolean
          semester?: number
          starting_roll?: number
          student_count?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          course_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          is_cancelled: boolean | null
          notes: string | null
          room: string | null
          scheduled_at: string
          teacher_id: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_cancelled?: boolean | null
          notes?: string | null
          room?: string | null
          scheduled_at: string
          teacher_id: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_cancelled?: boolean | null
          notes?: string | null
          room?: string | null
          scheduled_at?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          contact_hours: number | null
          course_type: string | null
          created_at: string
          created_by: string | null
          credits: number | null
          department: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_non_departmental: boolean
          name: string
          semester: string | null
          semester_number: number | null
          updated_at: string
          year: number | null
        }
        Insert: {
          code: string
          contact_hours?: number | null
          course_type?: string | null
          created_at?: string
          created_by?: string | null
          credits?: number | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_non_departmental?: boolean
          name: string
          semester?: string | null
          semester_number?: number | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          code?: string
          contact_hours?: number | null
          course_type?: string | null
          created_at?: string
          created_by?: string | null
          credits?: number | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_non_departmental?: boolean
          name?: string
          semester?: string | null
          semester_number?: number | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          entered_at: string
          entered_by: string | null
          exam_id: string
          grade: string | null
          id: string
          is_published: boolean | null
          marks_obtained: number | null
          remarks: string | null
          student_id: string
        }
        Insert: {
          entered_at?: string
          entered_by?: string | null
          exam_id: string
          grade?: string | null
          id?: string
          is_published?: boolean | null
          marks_obtained?: number | null
          remarks?: string | null
          student_id: string
        }
        Update: {
          entered_at?: string
          entered_by?: string | null
          exam_id?: string
          grade?: string | null
          id?: string
          is_published?: boolean | null
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_schedules: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          room: string | null
          scheduled_at: string
          title: string
          total_marks: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          id?: string
          room?: string | null
          scheduled_at: string
          title: string
          total_marks?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          room?: string | null
          scheduled_at?: string
          title?: string
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          file_url: string | null
          id: string
          teacher_id: string
          title: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          teacher_id: string
          title: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          notice_type: Database["public"]["Enums"]["notice_type"] | null
          posted_by: string | null
          title: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          notice_type?: Database["public"]["Enums"]["notice_type"] | null
          posted_by?: string | null
          title: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          notice_type?: Database["public"]["Enums"]["notice_type"] | null
          posted_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batch_id: string | null
          created_at: string
          department: string | null
          designation: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          batch_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          batch_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          course_id: string
          created_at: string
          custom_reason: string | null
          description: string | null
          emoji_reaction: string | null
          id: string
          preset_reason: string | null
          request_type: Database["public"]["Enums"]["request_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          student_id: string
          teacher_comment: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          custom_reason?: string | null
          description?: string | null
          emoji_reaction?: string | null
          id?: string
          preset_reason?: string | null
          request_type: Database["public"]["Enums"]["request_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          student_id: string
          teacher_comment?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          custom_reason?: string | null
          description?: string | null
          emoji_reaction?: string | null
          id?: string
          preset_reason?: string | null
          request_type?: Database["public"]["Enums"]["request_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          student_id?: string
          teacher_comment?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string
          department_id: string | null
          id: string
          number: string
          type: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          department_id?: string | null
          id?: string
          number: string
          type?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          department_id?: string | null
          id?: string
          number?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          batch_id: string
          course_id: string
          created_at: string
          day_of_week: number
          department_id: string
          id: string
          is_lab_continuation: boolean
          lab_group: number | null
          period_number: number
          room_id: string
          semester_id: string | null
          teacher_id: string
        }
        Insert: {
          batch_id: string
          course_id: string
          created_at?: string
          day_of_week: number
          department_id: string
          id?: string
          is_lab_continuation?: boolean
          lab_group?: number | null
          period_number: number
          room_id: string
          semester_id?: string | null
          teacher_id: string
        }
        Update: {
          batch_id?: string
          course_id?: string
          created_at?: string
          day_of_week?: number
          department_id?: string
          id?: string
          is_lab_continuation?: boolean
          lab_group?: number | null
          period_number?: number
          room_id?: string
          semester_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "academic_semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      teacher_courses: {
        Row: {
          assigned_at: string
          course_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          course_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          course_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
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
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "teacher" | "student" | "manager"
      attendance_status: "present" | "absent" | "late"
      exam_type: "mid" | "lab" | "final"
      notice_type: "urgent" | "informational" | "fun"
      request_status: "pending" | "approved" | "rejected"
      request_type:
        | "class_reschedule"
        | "exam_reschedule"
        | "extra_class"
        | "bonus_points"
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
      app_role: ["super_admin", "teacher", "student", "manager"],
      attendance_status: ["present", "absent", "late"],
      exam_type: ["mid", "lab", "final"],
      notice_type: ["urgent", "informational", "fun"],
      request_status: ["pending", "approved", "rejected"],
      request_type: [
        "class_reschedule",
        "exam_reschedule",
        "extra_class",
        "bonus_points",
      ],
    },
  },
} as const
