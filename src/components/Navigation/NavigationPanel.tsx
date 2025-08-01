import { useState, useEffect } from 'react'
import { X, Navigation, Clock, Car, Bike, User, Zap, Leaf } from 'lucide-react'
import { olaApi } from '../../services'
import SearchBar from '../Search/SearchBar'
import { OlaMaps } from 'olamaps-web-sdk'

interface NavigationPanelProps {
  map: any
  onClose: () => void
  currentLocation?: { lat: number; lng: number } | null
}

interface RouteInfo {
  distance: string
  duration: string
  steps: any[]
  geometry: any
  summary: string
  routeIndex: number
  travelAdvisory?: string
}

// Polyline decoding function
const decodePolyline = (encoded: string): number[][] => {
  const coordinates: number[][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b: number
    let shift = 0
    let result = 0

    // Decode latitude
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0

    // Decode longitude
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lng / 1e5, lat / 1e5])
  }

  return coordinates
}

// Helper function to extract meaningful step instructions
const getStepInstruction = (step: any): string => {
  // Use the instructions field from Ola Maps API response
  if (step.instructions) {
    return step.instructions
  }

  // Fallback to other possible fields
  const instruction = step.instruction || 
                     step.html_instructions || 
                     step.maneuver?.instruction ||
                     step.narrative ||
                     step.text

  if (instruction) {
    // Clean HTML tags if present
    return instruction.replace(/<[^>]*>/g, '')
  }

  // Fallback based on maneuver type
  if (step.maneuver) {
    return formatManeuverInstruction(step.maneuver, step.maneuver.modifier)
  }

  // Last resort fallback
  return 'Continue on route'
}

// Convert maneuver types to readable instructions
const formatManeuverInstruction = (type: string, modifier?: string, instruction?: string): string => {
  if (instruction && instruction !== type) return instruction

  const maneuverMap: { [key: string]: string } = {
    'turn': modifier ? `Turn ${modifier}` : 'Turn',
    'depart': 'Start your route',
    'arrive': 'You have arrived',
    'merge': 'Merge',
    'on-ramp': 'Take the ramp',
    'off-ramp': 'Exit the ramp',
    'fork': 'Take the fork',
    'end-of-road': 'Continue at end of road',
    'continue': 'Continue straight',
    'roundabout': 'Enter roundabout',
    'rotary': 'Enter rotary',
    'roundabout-turn': 'Exit roundabout',
    'notification': 'Continue',
    'new-name': 'Continue on new road',
    'suppress': 'Continue'
  }

  const baseInstruction = maneuverMap[type] || `Continue ${type}`
  
  if (modifier) {
    const modifierMap: { [key: string]: string } = {
      'left': 'left',
      'right': 'right',
      'sharp-left': 'sharp left',
      'sharp-right': 'sharp right',
      'slight-left': 'slight left',
      'slight-right': 'slight right',
      'straight': 'straight',
      'uturn': 'to make a U-turn'
    }
    
    const modifierText = modifierMap[modifier] || modifier
    
    if (type === 'turn') {
      return `Turn ${modifierText}`
    } else if (baseInstruction.includes('Continue')) {
      return baseInstruction
    } else {
      return `${baseInstruction} ${modifierText}`
    }
  }

  return baseInstruction
}

// Extract route summary from steps for "Via [road]" display
const extractRouteSummary = (route: any): string => {
  if (route.summary && route.summary.trim()) {
    return route.summary
  }

  // Extract main roads from steps
  const steps = route.legs?.[0]?.steps || []
  const roads = steps
    .map((step: any) => step.instructions)
    .filter((instruction: string) => instruction && instruction.includes(' on '))
    .map((instruction: string) => {
      const match = instruction.match(/on (.+?)(?:\s|$|,)/)
      return match ? match[1] : null
    })
    .filter((road: string | null) => road && road.length > 2)
    .slice(0, 2) // Take first 2 main roads

  if (roads.length > 0) {
    return `Via ${roads.join(', ')}`
  }

  return `Route ${route.routeIndex || 1}`
}

// Parse travel advisory for traffic information
const parseTrafficInfo = (travelAdvisory?: string): { hasTraffic: boolean; severity: 'low' | 'medium' | 'high' } => {
  if (!travelAdvisory) return { hasTraffic: false, severity: 'low' }

  try {
    // travel_advisory format: "0,1,0 | 1,3,15" (example)
    // This appears to be segments with traffic levels
    const segments = travelAdvisory.split(' | ')
    let maxTrafficLevel = 0

    segments.forEach(segment => {
      const values = segment.split(',').map(Number)
      if (values.length >= 3) {
        const trafficLevel = values[2] // Assuming third value is traffic level
        maxTrafficLevel = Math.max(maxTrafficLevel, trafficLevel)
      }
    })

    const hasTraffic = maxTrafficLevel > 0
    let severity: 'low' | 'medium' | 'high' = 'low'
    
    if (maxTrafficLevel > 10) severity = 'high'
    else if (maxTrafficLevel > 5) severity = 'medium'

    return { hasTraffic, severity }
  } catch (error) {
    return { hasTraffic: false, severity: 'low' }
  }
}

// Calculate carbon footprint based on distance and transport mode
const calculateCarbonFootprint = (distance: string, carbonFactor: number): { co2: number; trees: number; savings: number } => {
  // Extract numeric value from distance string (e.g., "5.2 km" -> 5.2)
  const distanceNum = parseFloat(distance.replace(/[^\d.]/g, '')) || 0
  
  // Calculate CO2 emissions in kg
  const co2 = distanceNum * carbonFactor
  
  // Trees needed to offset CO2 (1 tree absorbs ~21.8 kg CO2/year)
  const trees = co2 / 21.8
  
  // Calculate savings compared to driving (0.21 kg CO2/km)
  const drivingEmissions = distanceNum * 0.21
  const savings = Math.max(0, drivingEmissions - co2)
  
  return { co2, trees, savings }
}


const NavigationPanel = ({ map, onClose, currentLocation }: NavigationPanelProps) => {
  const [origin, setOrigin] = useState<{lat: number, lng: number, address: string, name: string} | null>(null)
  const [destination, setDestination] = useState<{lat: number, lng: number, address: string, name: string} | null>(null)
  const [routes, setRoutes] = useState<RouteInfo[]>([])
  const [selectedRoute, setSelectedRoute] = useState<number>(0)
  const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'bicycling' | 'electric_scooter'>('driving')
  const [isCalculating, setIsCalculating] = useState(false)
  const [routeMarkers, setRouteMarkers] = useState<any[]>([])
  const [routeLayer, setRouteLayer] = useState<string | null>(null)

  const travelModes = [
    { 
      id: 'driving', 
      icon: Car, 
      label: 'Car',
      carbonFactor: 0.21, // kg CO2 per km
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    { 
      id: 'electric_scooter', 
      icon: Zap, 
      label: 'E-Scooter',
      carbonFactor: 0.05, // kg CO2 per km
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    { 
      id: 'bicycling', 
      icon: Bike, 
      label: 'Cycling',
      carbonFactor: 0.0, // kg CO2 per km
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    { 
      id: 'walking', 
      icon: User, 
      label: 'Walking',
      carbonFactor: 0.0, // kg CO2 per km
      color: 'bg-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    }
  ]

  useEffect(() => {
    if (origin && destination) {
      calculateRoute()
    }
  }, [origin, destination, travelMode])

  const calculateRoute = async () => {
    if (!origin || !destination || !map) return

    setIsCalculating(true)
    try {
      // Map travel modes to Ola API parameters
      const modeMapping: { [key: string]: string } = {
        'driving': 'driving',
        'walking': 'walking', 
        'bicycling': 'cycling',
        'electric_scooter': 'driving' // Use driving routes for e-scooter
      }
      
      const selectedMode = modeMapping[travelMode] || 'driving'
      console.log(`Calculating route for mode: ${selectedMode} (original: ${travelMode})`)
      
      const response = await olaApi.getDirections(
        { lat: origin.lat, lng: origin.lng },
        { lat: destination.lat, lng: destination.lng },
        selectedMode
      )

      console.log('Directions API response:', response)
      
      // Check if response has the expected structure
      if (!response) {
        throw new Error('No response from directions API')
      }

      if (response.routes && response.routes.length > 0) {
        const transformedRoutes = response.routes.map((route: any, index: number) => ({
          distance: route.legs?.[0]?.readable_distance || 'Unknown',
          duration: route.legs?.[0]?.readable_duration || 'Unknown',
          steps: route.legs?.[0]?.steps || [],
          geometry: route.overview_polyline,
          summary: extractRouteSummary(route),
          routeIndex: index + 1,
          travelAdvisory: route.travel_advisory
        }))

        console.log('Transformed routes:', transformedRoutes)
        console.log('Sample steps for debugging:', transformedRoutes[0]?.steps?.slice(0, 3))
        console.log('Travel advisory data:', transformedRoutes.map((r: RouteInfo) => ({ 
          routeIndex: r.routeIndex,
          travelAdvisory: r.travelAdvisory,
          hasAdvisory: !!r.travelAdvisory
        })))
        setRoutes(transformedRoutes)
        setSelectedRoute(0)
        displayRouteOnMap(transformedRoutes[0])
      } else {
        console.log('No routes found in response:', response)
      }
    } catch (error) {
      console.error('Error calculating route:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  const displayRouteOnMap = (route: RouteInfo) => {
    if (!map || !route.geometry) {
      console.log('Cannot display route - missing map or geometry:', { map: !!map, geometry: !!route.geometry })
      return
    }

    console.log('Displaying route on map:', route)

    // Clear existing route
    clearRouteFromMap()

    const addRouteToMap = () => {
      try {
        // Add route markers using the OlaMaps SDK
        const markers: any[] = []
        
        const apiKey = import.meta.env.VITE_OLA_MAPS_API_KEY
        
        if (origin) {
          // Create green marker for origin using OlaMaps SDK
          const olaMaps = new OlaMaps({ apiKey })
          const originMarker = olaMaps
            .addMarker({ 
              offset: [0, 0], 
              anchor: 'bottom',
              color: '#00C851' // Green color for origin
            })
            .setLngLat([origin.lng, origin.lat])
            .addTo(map)
          markers.push(originMarker)
        }

        if (destination) {
          const olaMaps = new OlaMaps({ apiKey })
          const destMarker = olaMaps
            .addMarker({ 
              offset: [0, 0], 
              anchor: 'bottom',
              color: '#FF4444' // Red color for destination
            })
            .setLngLat([destination.lng, destination.lat])
            .addTo(map)
          markers.push(destMarker)
        }

        setRouteMarkers(markers)

        // Add route line
        const routeId = `route-${Date.now()}`
        
        // Handle different geometry formats
        let geometry = route.geometry
        if (typeof geometry === 'string') {
          // If it's an encoded polyline, decode it to coordinates
          console.log('Geometry is encoded polyline:', geometry)
          try {
            const coordinates = decodePolyline(geometry)
            geometry = {
              type: 'LineString',
              coordinates: coordinates
            }
            console.log('Decoded polyline to coordinates:', coordinates.length, 'points')
          } catch (error) {
            console.error('Error decoding polyline:', error)
            return
          }
        }

        if (geometry && geometry.coordinates) {
          console.log('Adding route source and layer:', geometry)
          
          // Get polyline color based on travel mode
          const getRouteColor = (mode: string): string => {
            const colors = {
              'driving': '#FF6B35',       // Orange for driving
              'walking': '#4CAF50',       // Green for walking  
              'bicycling': '#2196F3',     // Blue for cycling
              'electric_scooter': '#9C27B0' // Purple for e-scooter
            }
            return colors[mode as keyof typeof colors] || '#00C851' // Default green
          }

          const getRouteWidth = (mode: string): number => {
            const widths = {
              'driving': 6,           // Thicker for cars
              'walking': 4,           // Thinner for walking
              'bicycling': 5,         // Medium for cycling
              'electric_scooter': 5   // Medium for e-scooter
            }
            return widths[mode as keyof typeof widths] || 6
          }

          const selectedMode = (() => {
            const modeMapping: { [key: string]: string } = {
              'driving': 'driving',
              'walking': 'walking',
              'bicycling': 'bicycling', 
              'electric_scooter': 'electric_scooter'
            }
            return modeMapping[travelMode] || 'driving'
          })()
          
          map.addSource(routeId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { mode: selectedMode },
              geometry: geometry
            }
          })

          map.addLayer({
            id: routeId,
            type: 'line',
            source: routeId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': getRouteColor(selectedMode),
              'line-width': getRouteWidth(selectedMode),
              'line-opacity': 0.8
            }
          })

          // Add a subtle outline for better visibility
          map.addLayer({
            id: `${routeId}-outline`,
            type: 'line',
            source: routeId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#FFFFFF',
              'line-width': getRouteWidth(selectedMode) + 2,
              'line-opacity': 0.3
            }
          }, routeId) // Add outline below main line

          setRouteLayer(routeId)

          // Fit map to route by calculating center point
          if (geometry.coordinates && geometry.coordinates.length > 0) {
            const coordinates = geometry.coordinates
            // Calculate center of route
            const lats = coordinates.map((coord: number[]) => coord[1])
            const lngs = coordinates.map((coord: number[]) => coord[0])
            const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
            const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
            
            map.flyTo({
              center: [centerLng, centerLat],
              zoom: 12
            })
          }
        }

        // If no geometry, at least center between origin and destination
        if (!geometry && origin && destination) {
          const centerLat = (origin.lat + destination.lat) / 2
          const centerLng = (origin.lng + destination.lng) / 2
          
          map.flyTo({
            center: [centerLng, centerLat],
            zoom: 12
          })
        }

      } catch (error) {
        console.error('Error displaying route on map:', error)
      }
    }

    // Check if map is loaded, if not wait for load event
    if (map.isStyleLoaded()) {
      addRouteToMap()
    } else {
      map.on('load', addRouteToMap)
    }
  }

  const clearRouteFromMap = () => {
    // Remove markers
    routeMarkers.forEach(marker => marker.remove())
    setRouteMarkers([])

    // Remove route layers (both main and outline)
    if (routeLayer && map) {
      // Remove main route layer
      if (map.getLayer(routeLayer)) {
        map.removeLayer(routeLayer)
      }
      // Remove outline layer
      if (map.getLayer(`${routeLayer}-outline`)) {
        map.removeLayer(`${routeLayer}-outline`)
      }
      // Remove source
      if (map.getSource(routeLayer)) {
        map.removeSource(routeLayer)
      }
      setRouteLayer(null)
    }
  }

  const swapOriginDestination = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Navigation className="w-5 h-5 text-ola-green mr-2" />
          <h2 className="font-semibold text-gray-900">Directions</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Travel Mode Selection - Fixed Layout */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-lg p-1">
          {travelModes.map((mode) => {
            const Icon = mode.icon
            const isSelected = travelMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => setTravelMode(mode.id as any)}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all duration-200 ${
                  isSelected
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center mb-1">
                  <Icon className="w-4 h-4" />
                  {/* Subtle eco indicator */}
                  {mode.carbonFactor === 0 && (
                    <Leaf className="w-2 h-2 text-green-500 ml-1" />
                  )}
                </div>
                <span className="text-xs font-medium text-center leading-tight">
                  {mode.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Origin/Destination Inputs */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <div className="w-3 h-3 bg-ola-green rounded-full"></div>
          </div>
          <div className="pl-8">
            <SearchBar
              key="origin-search"
              onLocationSelect={setOrigin}
              currentLocation={currentLocation}
              showLocateButton={true}
              hasSelectedLocation={!!origin}
            />
            {origin && (
              <div className="mt-1 text-sm text-gray-600 truncate">
                {origin.address}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={swapOriginDestination}
          className="w-full flex justify-center py-1"
        >
          <div className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50">
            <div className="text-gray-400">⇅</div>
          </div>
        </button>

        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
          <div className="pl-8">
            <SearchBar
              key="destination-search"
              onLocationSelect={setDestination}
              currentLocation={currentLocation}
              showLocateButton={false}
              hasSelectedLocation={!!destination}
            />
            {destination && (
              <div className="mt-1 text-sm text-gray-600 truncate">
                {destination.address}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Route Results */}
      <div className="flex-1 overflow-y-auto">
        {isCalculating && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ola-green mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Calculating route...</p>
          </div>
        )}

        {routes.length > 0 && (
          <div className="p-4">
            <div className="space-y-3">
              {routes.map((route, index) => {
                const trafficInfo = parseTrafficInfo(route.travelAdvisory)
                const selectedMode = travelModes.find(m => m.id === travelMode)
                const footprint = calculateCarbonFootprint(route.distance, selectedMode?.carbonFactor || 0)
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedRoute(index)
                      displayRouteOnMap(route)
                    }}
                    className={`w-full p-4 text-left rounded-lg border transition-colors ${
                      selectedRoute === index
                        ? 'border-ola-green bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <Navigation className="w-4 h-4 mr-2 text-ola-green" />
                        {route.summary}
                        {/* Simple traffic indicator */}
                        {trafficInfo.hasTraffic && (
                          <div className={`ml-2 w-2 h-2 rounded-full ${
                            trafficInfo.severity === 'high' ? 'bg-red-500' :
                            trafficInfo.severity === 'medium' ? 'bg-yellow-500' : 'bg-orange-400'
                          }`} />
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-700">
                        {route.distance}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {route.duration}
                      </div>
                      
                      {/* Subtle eco indicator */}
                      {footprint.co2 === 0 && (
                        <div className="flex items-center text-xs text-green-600">
                          <Leaf className="w-3 h-3 mr-1" />
                          Zero emissions
                        </div>
                      )}
                      {footprint.co2 > 0 && footprint.savings > 0 && (
                        <div className="text-xs text-gray-500">
                          {footprint.co2.toFixed(1)} kg CO₂
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Route Steps - Clean and Focused */}
            {routes[selectedRoute] && routes[selectedRoute].steps.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Navigation className="w-4 h-4 mr-2 text-ola-green" />
                  Turn-by-turn directions
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {routes[selectedRoute].steps.slice(0, 8).map((step: any, index: number) => (
                    <div key={index} className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-ola-green text-white flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 font-medium">
                          {getStepInstruction(step)}
                        </div>
                        {(step.readable_distance || step.distance) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {step.readable_distance || step.distance?.text || step.distance}
                            {(step.readable_duration || step.duration) && 
                              ` • ${step.readable_duration || step.duration?.text || step.duration}`
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {routes[selectedRoute].steps.length > 8 && (
                    <div className="text-center py-2 text-sm text-gray-500 bg-gray-50 rounded-lg">
                      +{routes[selectedRoute].steps.length - 8} more steps
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!isCalculating && routes.length === 0 && (origin || destination) && (
          <div className="p-4 text-center text-gray-500">
            {!origin || !destination 
              ? "Enter both origin and destination to get directions"
              : "No routes found"
            }
          </div>
        )}
      </div>
    </div>
  )
}

export default NavigationPanel