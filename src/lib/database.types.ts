// Hand-written to match supabase/migrations. Regenerate with:
//   npx supabase gen types typescript --linked > src/lib/database.types.ts

export type MediaType = 'movie' | 'tv'
export type WatchStatus = 'watched' | 'watching' | 'want' | 'dropped'

export interface TitleRow {
  id: string
  user_id: string
  tmdb_id: number
  media_type: MediaType
  title: string
  year: number | null
  poster_path: string | null
  genres: string[]
  runtime: number | null
  status: WatchStatus
  rating: number | null
  notes: string | null
  watched_on: string | null
  times_watched: number
  favorite: boolean
  created_at: string
  updated_at: string
}

export interface EpisodeWatchRow {
  id: string
  user_id: string
  title_id: string
  season: number
  episode: number
  watched_at: string
}

type Insert<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>

export interface Database {
  public: {
    Tables: {
      titles: {
        Row: TitleRow
        Insert: Insert<TitleRow, 'tmdb_id' | 'media_type' | 'title'>
        Update: Partial<TitleRow>
        Relationships: []
      }
      episode_watches: {
        Row: EpisodeWatchRow
        Insert: Insert<EpisodeWatchRow, 'title_id' | 'season' | 'episode'>
        Update: Partial<EpisodeWatchRow>
        Relationships: [
          {
            foreignKeyName: 'episode_watches_title_id_user_id_fkey'
            columns: ['title_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'titles'
            referencedColumns: ['id', 'user_id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
