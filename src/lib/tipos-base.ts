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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alertas_de_contenido: {
        Row: {
          comprobacion: string
          descartada_en: string | null
          descartada_por: string | null
          detectada_en: string
          evidencia: string
          id: number
          id_noticia: string
          motivo_descarte: string | null
        }
        Insert: {
          comprobacion: string
          descartada_en?: string | null
          descartada_por?: string | null
          detectada_en?: string
          evidencia: string
          id?: never
          id_noticia: string
          motivo_descarte?: string | null
        }
        Update: {
          comprobacion?: string
          descartada_en?: string | null
          descartada_por?: string | null
          detectada_en?: string
          evidencia?: string
          id?: never
          id_noticia?: string
          motivo_descarte?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_de_contenido_descartada_por_fkey"
            columns: ["descartada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_de_contenido_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "noticias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_de_contenido_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "vista_noticias_ranking"
            referencedColumns: ["id_noticia"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          detalle: Json
          entidad: string
          id: number
          id_actor: string | null
          id_entidad: string | null
          ocurrido_en: string
        }
        Insert: {
          accion: string
          detalle?: Json
          entidad: string
          id?: never
          id_actor?: string | null
          id_entidad?: string | null
          ocurrido_en?: string
        }
        Update: {
          accion?: string
          detalle?: Json
          entidad?: string
          id?: never
          id_actor?: string | null
          id_entidad?: string | null
          ocurrido_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_id_actor_fkey"
            columns: ["id_actor"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          actualizado_en: string
          contenido: string
          creado_en: string
          id: number
          id_noticia: string
          id_usuario: string
          oculto: boolean
        }
        Insert: {
          actualizado_en?: string
          contenido: string
          creado_en?: string
          id?: never
          id_noticia: string
          id_usuario: string
          oculto?: boolean
        }
        Update: {
          actualizado_en?: string
          contenido?: string
          creado_en?: string
          id?: never
          id_noticia?: string
          id_usuario?: string
          oculto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "noticias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "vista_noticias_ranking"
            referencedColumns: ["id_noticia"]
          },
          {
            foreignKeyName: "comentarios_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones: {
        Row: {
          creado_en: string
          id: string
          id_usuario: string
          ultimo_mensaje_en: string
        }
        Insert: {
          creado_en?: string
          id?: string
          id_usuario: string
          ultimo_mensaje_en?: string
        }
        Update: {
          creado_en?: string
          id?: string
          id_usuario?: string
          ultimo_mensaje_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_verificadas: {
        Row: {
          autoridad: number
          creado_en: string
          id_usuario: string
          justificacion: string
          otorgada_por: string
        }
        Insert: {
          autoridad: number
          creado_en?: string
          id_usuario: string
          justificacion: string
          otorgada_por: string
        }
        Update: {
          autoridad?: number
          creado_en?: string
          id_usuario?: string
          justificacion?: string
          otorgada_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_verificadas_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_verificadas_otorgada_por_fkey"
            columns: ["otorgada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fuentes: {
        Row: {
          actualizado_en: string
          creado_en: string
          curada_por: string | null
          dominio: string
          id: number
          justificacion: string
          nivel: Database["public"]["Enums"]["nivel_fuente"]
          nombre: string
          puntaje_credibilidad: number
          url_rss: string | null
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          curada_por?: string | null
          dominio: string
          id?: never
          justificacion: string
          nivel?: Database["public"]["Enums"]["nivel_fuente"]
          nombre: string
          puntaje_credibilidad?: number
          url_rss?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          curada_por?: string | null
          dominio?: string
          id?: never
          justificacion?: string
          nivel?: Database["public"]["Enums"]["nivel_fuente"]
          nombre?: string
          puntaje_credibilidad?: number
          url_rss?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuentes_curada_por_fkey"
            columns: ["curada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      interacciones: {
        Row: {
          creado_en: string
          id: number
          id_noticia: string
          id_usuario: string
          tipo: Database["public"]["Enums"]["tipo_interaccion"]
        }
        Insert: {
          creado_en?: string
          id?: never
          id_noticia: string
          id_usuario: string
          tipo: Database["public"]["Enums"]["tipo_interaccion"]
        }
        Update: {
          creado_en?: string
          id?: never
          id_noticia?: string
          id_usuario?: string
          tipo?: Database["public"]["Enums"]["tipo_interaccion"]
        }
        Relationships: [
          {
            foreignKeyName: "interacciones_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "noticias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacciones_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "vista_noticias_ranking"
            referencedColumns: ["id_noticia"]
          },
          {
            foreignKeyName: "interacciones_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          bloqueado: boolean
          categoria_intencion: string | null
          contenido: string
          costo_usd: number | null
          creado_en: string
          id: number
          id_conversacion: string
          latencia_ms: number | null
          modelo: string | null
          motivo_bloqueo: string | null
          noticias_citadas: string[]
          rol: string
          tokens_cache: number | null
          tokens_entrada: number | null
          tokens_salida: number | null
          veredicto_capa0: string | null
          veredicto_capa3: string | null
        }
        Insert: {
          bloqueado?: boolean
          categoria_intencion?: string | null
          contenido: string
          costo_usd?: number | null
          creado_en?: string
          id?: never
          id_conversacion: string
          latencia_ms?: number | null
          modelo?: string | null
          motivo_bloqueo?: string | null
          noticias_citadas?: string[]
          rol: string
          tokens_cache?: number | null
          tokens_entrada?: number | null
          tokens_salida?: number | null
          veredicto_capa0?: string | null
          veredicto_capa3?: string | null
        }
        Update: {
          bloqueado?: boolean
          categoria_intencion?: string | null
          contenido?: string
          costo_usd?: number | null
          creado_en?: string
          id?: never
          id_conversacion?: string
          latencia_ms?: number | null
          modelo?: string | null
          motivo_bloqueo?: string | null
          noticias_citadas?: string[]
          rol?: string
          tokens_cache?: number | null
          tokens_entrada?: number | null
          tokens_salida?: number | null
          veredicto_capa0?: string | null
          veredicto_capa3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_id_conversacion_fkey"
            columns: ["id_conversacion"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      noticias: {
        Row: {
          actualizado_en: string
          busqueda: unknown
          componente_fuente: number
          componente_interacciones: number
          componente_veracidad: number
          componente_verificadas: number
          creado_en: string
          credito_imagen: string | null
          cuerpo: string
          estado: Database["public"]["Enums"]["estado_noticia"]
          id: string
          id_autor: string
          id_fuente: number | null
          penalizacion_estado: number
          publicada_en: string | null
          puntaje_veracidad: number | null
          rafaga_motivo: string | null
          rafaga_revisada_por: string | null
          rafaga_sospechosa: boolean
          relevancia: number
          relevancia_calculada_en: string | null
          resumen: string
          seccion: Database["public"]["Enums"]["seccion_noticia"]
          texto_alterno_imagen: string | null
          titulo: string
          url_imagen: string | null
          url_original: string | null
        }
        Insert: {
          actualizado_en?: string
          busqueda?: unknown
          componente_fuente?: number
          componente_interacciones?: number
          componente_veracidad?: number
          componente_verificadas?: number
          creado_en?: string
          credito_imagen?: string | null
          cuerpo: string
          estado?: Database["public"]["Enums"]["estado_noticia"]
          id?: string
          id_autor: string
          id_fuente?: number | null
          penalizacion_estado?: number
          publicada_en?: string | null
          puntaje_veracidad?: number | null
          rafaga_motivo?: string | null
          rafaga_revisada_por?: string | null
          rafaga_sospechosa?: boolean
          relevancia?: number
          relevancia_calculada_en?: string | null
          resumen: string
          seccion?: Database["public"]["Enums"]["seccion_noticia"]
          texto_alterno_imagen?: string | null
          titulo: string
          url_imagen?: string | null
          url_original?: string | null
        }
        Update: {
          actualizado_en?: string
          busqueda?: unknown
          componente_fuente?: number
          componente_interacciones?: number
          componente_veracidad?: number
          componente_verificadas?: number
          creado_en?: string
          credito_imagen?: string | null
          cuerpo?: string
          estado?: Database["public"]["Enums"]["estado_noticia"]
          id?: string
          id_autor?: string
          id_fuente?: number | null
          penalizacion_estado?: number
          publicada_en?: string | null
          puntaje_veracidad?: number | null
          rafaga_motivo?: string | null
          rafaga_revisada_por?: string | null
          rafaga_sospechosa?: boolean
          relevancia?: number
          relevancia_calculada_en?: string | null
          resumen?: string
          seccion?: Database["public"]["Enums"]["seccion_noticia"]
          texto_alterno_imagen?: string | null
          titulo?: string
          url_imagen?: string | null
          url_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noticias_id_autor_fkey"
            columns: ["id_autor"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noticias_id_fuente_fkey"
            columns: ["id_fuente"]
            isOneToOne: false
            referencedRelation: "fuentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noticias_rafaga_revisada_por_fkey"
            columns: ["rafaga_revisada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos_rol: {
        Row: {
          clave_permiso: string
          id: number
          id_rol: number
        }
        Insert: {
          clave_permiso: string
          id?: never
          id_rol: number
        }
        Update: {
          clave_permiso?: string
          id?: never
          id_rol?: number
        }
        Relationships: [
          {
            foreignKeyName: "permisos_rol_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      pesos_ranking: {
        Row: {
          cambiado_por: string | null
          clave: string
          id: number
          motivo: string
          valor: number
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          cambiado_por?: string | null
          clave: string
          id?: never
          motivo: string
          valor: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          cambiado_por?: string | null
          clave?: string
          id?: never
          motivo?: string
          valor?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesos_ranking_cambiado_por_fkey"
            columns: ["cambiado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          clave: string
          creado_en: string
          id: number
          nombre: string
        }
        Insert: {
          clave: string
          creado_en?: string
          id?: never
          nombre: string
        }
        Update: {
          clave?: string
          creado_en?: string
          id?: never
          nombre?: string
        }
        Relationships: []
      }
      silencios: {
        Row: {
          accion: Database["public"]["Enums"]["accion_restringible"]
          creado_en: string
          id: number
          id_usuario: string
          impuesto_por: string
          motivo: string
          vence_en: string | null
        }
        Insert: {
          accion: Database["public"]["Enums"]["accion_restringible"]
          creado_en?: string
          id?: never
          id_usuario: string
          impuesto_por: string
          motivo: string
          vence_en?: string | null
        }
        Update: {
          accion?: Database["public"]["Enums"]["accion_restringible"]
          creado_en?: string
          id?: never
          id_usuario?: string
          impuesto_por?: string
          motivo?: string
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "silencios_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silencios_impuesto_por_fkey"
            columns: ["impuesto_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          correo: string
          creado_en: string
          id: string
          id_rol: number
          nombre: string
        }
        Insert: {
          correo: string
          creado_en?: string
          id: string
          id_rol: number
          nombre: string
        }
        Update: {
          correo?: string
          creado_en?: string
          id?: string
          id_rol?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      validaciones: {
        Row: {
          aporte: number
          detalle: Json
          disponible: boolean
          evaluada_en: string
          id: number
          id_noticia: string
          senal: Database["public"]["Enums"]["senal_validacion"]
        }
        Insert: {
          aporte: number
          detalle?: Json
          disponible?: boolean
          evaluada_en?: string
          id?: never
          id_noticia: string
          senal: Database["public"]["Enums"]["senal_validacion"]
        }
        Update: {
          aporte?: number
          detalle?: Json
          disponible?: boolean
          evaluada_en?: string
          id?: never
          id_noticia?: string
          senal?: Database["public"]["Enums"]["senal_validacion"]
        }
        Relationships: [
          {
            foreignKeyName: "validaciones_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "noticias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validaciones_id_noticia_fkey"
            columns: ["id_noticia"]
            isOneToOne: false
            referencedRelation: "vista_noticias_ranking"
            referencedColumns: ["id_noticia"]
          },
        ]
      }
    }
    Views: {
      vista_gasto_api: {
        Row: {
          gasto_usd: number | null
          turnos: number | null
        }
        Relationships: []
      }
      vista_interacciones_ranking: {
        Row: {
          autoridad: number | null
          creada_en: string | null
          cuenta_creada_en: string | null
          id_noticia: string | null
          tipo: string | null
        }
        Relationships: []
      }
      vista_noticias_ranking: {
        Row: {
          credibilidad_fuente: number | null
          estado: Database["public"]["Enums"]["estado_noticia"] | null
          id_noticia: string | null
          publicada_en: string | null
          puntaje_veracidad: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      accion_restringible: "comentar" | "reaccionar"
      estado_noticia:
        | "borrador"
        | "en_revision"
        | "verificada"
        | "no_verificable"
        | "desmentida"
        | "archivada"
      nivel_fuente:
        | "agencia_internacional"
        | "medio_nacional"
        | "medio_digital"
        | "blog"
        | "desconocido"
      seccion_noticia:
        | "general"
        | "guatemala"
        | "mundo"
        | "politica"
        | "economia"
        | "deportes"
        | "cultura"
        | "tecnologia"
      senal_validacion:
        | "credibilidad_fuente"
        | "url_verificable"
        | "corroboracion"
        | "desmentido"
        | "coherencia"
      tipo_interaccion: "lectura" | "reaccion"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      accion_restringible: ["comentar", "reaccionar"],
      estado_noticia: [
        "borrador",
        "en_revision",
        "verificada",
        "no_verificable",
        "desmentida",
        "archivada",
      ],
      nivel_fuente: [
        "agencia_internacional",
        "medio_nacional",
        "medio_digital",
        "blog",
        "desconocido",
      ],
      seccion_noticia: [
        "general",
        "guatemala",
        "mundo",
        "politica",
        "economia",
        "deportes",
        "cultura",
        "tecnologia",
      ],
      senal_validacion: [
        "credibilidad_fuente",
        "url_verificable",
        "corroboracion",
        "desmentido",
        "coherencia",
      ],
      tipo_interaccion: ["lectura", "reaccion"],
    },
  },
} as const
