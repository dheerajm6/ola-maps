/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OLA_MAPS_API_KEY: string
  readonly VITE_OLA_MAPS_CLIENT_ID: string
  readonly VITE_OLA_MAPS_CLIENT_SECRET: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DEFAULT_LAT: string
  readonly VITE_DEFAULT_LNG: string
  readonly VITE_DEFAULT_ZOOM: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}