const API_BASE_URL = 'https://api.olamaps.io'

class OlaApiService {
  private apiKey: string
  private clientId: string
  private clientSecret: string

  constructor() {
    this.apiKey = import.meta.env.VITE_OLA_MAPS_API_KEY
    this.clientId = import.meta.env.VITE_OLA_MAPS_CLIENT_ID
    this.clientSecret = import.meta.env.VITE_OLA_MAPS_CLIENT_SECRET

    if (!this.apiKey || !this.clientId || !this.clientSecret) {
      throw new Error('Missing Ola Maps API credentials')
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}, method: string = 'GET') {
    const url = new URL(endpoint, API_BASE_URL)
    
    // Add api_key as query parameter
    url.searchParams.append('api_key', this.apiKey)
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key].toString())
      }
    })

    const response = await fetch(url.toString(), {
      method: method,
      headers: {
        'X-Request-Id': 'XXX',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Ola Maps API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Autocomplete API
  async autocomplete(query: string, location?: { lat: number; lng: number }) {
    const params: any = { input: query }
    if (location) {
      params.location = `${location.lat},${location.lng}`
    }
    return this.makeRequest('/places/v1/autocomplete', params)
  }

  // Place Details API
  async getPlaceDetails(placeId: string) {
    return this.makeRequest('/places/v1/details', { place_id: placeId })
  }

  // Advanced Place Details API
  async getAdvancedPlaceDetails(placeId: string) {
    return this.makeRequest('/places/v1/details/advanced', { place_id: placeId })
  }

  // Nearby Search API
  async nearbySearch(location: { lat: number; lng: number }, layers?: string, types?: string, radius?: number) {
    const params: any = {
      location: `${location.lat},${location.lng}`
    }
    if (layers) params.layers = layers
    if (types) params.types = types
    if (radius) params.radius = radius
    return this.makeRequest('/places/v1/nearbysearch', params)
  }

  // Advanced Nearby Search API
  async advancedNearbySearch(location: { lat: number; lng: number }, layers?: string, types?: string, radius?: number) {
    const params: any = {
      location: `${location.lat},${location.lng}`
    }
    if (layers) params.layers = layers
    if (types) params.types = types
    if (radius) params.radius = radius
    return this.makeRequest('/places/v1/nearbysearch/advanced', params)
  }

  // Photo API
  async getPhoto(photoReference: string) {
    return this.makeRequest('/places/v1/photo', { photo_reference: photoReference })
  }

  // Text Search API
  async textSearch(query: string) {
    return this.makeRequest('/places/v1/textsearch', { input: query })
  }

  // Address Validation API
  async validateAddress(address: string) {
    return this.makeRequest('/places/v1/addressvalidation', { address })
  }

  // Elevation API
  async getElevation(location: { lat: number; lng: number }) {
    return this.makeRequest('/places/v1/elevation', { location: `${location.lat},${location.lng}` })
  }

  // Geocoding API (Forward Geocoding)
  async geocode(address: string) {
    return this.makeRequest('/places/v1/geocode', { address })
  }

  // Reverse Geocoding API
  async reverseGeocode(lat: number, lng: number) {
    return this.makeRequest('/places/v1/reverse-geocode', { latlng: `${lat},${lng}` })
  }

  // Directions API
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: string = 'driving',
    waypoints?: { lat: number; lng: number }[]
  ) {
    const params: any = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      travel_mode: mode // Use correct parameter name for Ola Maps API
    }
    
    if (waypoints && waypoints.length > 0) {
      params.waypoints = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|')
    }

    console.log('Directions API request params:', params)
    return this.makeRequest('/routing/v1/directions', params, 'POST')
  }

  // Distance Matrix API
  async getDistanceMatrix(
    origins: { lat: number; lng: number }[],
    destinations: { lat: number; lng: number }[]
  ) {
    const params = {
      origins: origins.map(o => `${o.lat},${o.lng}`).join('|'),
      destinations: destinations.map(d => `${d.lat},${d.lng}`).join('|')
    }

    return this.makeRequest('/routing/v1/distanceMatrix', params)
  }

  // Snap to Road API
  async snapToRoad(path: { lat: number; lng: number }[]) {
    const params = {
      points: path.map(p => `${p.lat},${p.lng}`).join('|'),
      enhancePath: false
    }
    return this.makeRequest('/routing/v1/snapToRoad', params)
  }

  // Speed Limits API
  async getSpeedLimits(path: { lat: number; lng: number }[]) {
    const params = {
      points: path.map(p => `${p.lat},${p.lng}`).join('|'),
      snapStrategy: 'snaptoroad'
    }
    return this.makeRequest('/routing/v1/speedLimits', params)
  }

  // Route Optimizer API
  async optimizeRoute(locations: { lat: number; lng: number }[]) {
    const params = {
      locations: locations.map(l => `${l.lat},${l.lng}`).join('|')
    }
    return this.makeRequest('/routing/v1/routeOptimizer', params, 'POST')
  }

  // Nearest Roads API
  async getNearestRoads(point: { lat: number; lng: number }, radius: number = 100) {
    const params = {
      points: `${point.lat},${point.lng}`,
      radius
    }
    return this.makeRequest('/routing/v1/nearestRoads', params)
  }

  // Get traffic signals near a location (uses Nearby Search with specific type)
  async getTrafficSignals(location: { lat: number; lng: number }, radius: number = 500) {
    return this.nearbySearch(location, 'venue', 'traffic_light', radius)
  }
}

export default OlaApiService