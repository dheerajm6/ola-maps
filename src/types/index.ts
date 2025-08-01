export interface TrafficSignal {
  id: string
  lat: number
  lng: number
  name: string
  currentState: 'red' | 'yellow' | 'green'
  countdown: number
  pedestrianWalk: boolean
  lastUpdated?: string
}

export interface SignalTiming {
  red_duration: number
  green_duration: number
  yellow_duration: number
  walk_duration: number
}

export interface Route {
  id: string
  user_id?: string
  start_point: Location
  end_point: Location
  waypoints: Location[]
  distance: number
  duration: number
  traffic_signals: TrafficSignal[]
  created_at: string
}

export interface Location {
  lat: number
  lng: number
  address?: string
  name?: string
}

export interface SearchResult {
  place_id: string
  name: string
  address: string
  location: Location
  rating?: number
  place_type: string
}

export interface MapState {
  center: Location
  zoom: number
  bearing: number
  pitch: number
}

export interface User {
  id: string
  email: string
  name?: string
  preferences: UserPreferences
  created_at: string
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  map_style: 'default' | 'satellite' | 'terrain'
  show_traffic: boolean
  show_signals: boolean
  navigation_voice: boolean
}