import { useEffect, useRef, useState } from 'react'
import { OlaMaps } from 'olamaps-web-sdk'
import { Search, Navigation, MapPin, Layers } from 'lucide-react'
import SearchBar from '../Search/SearchBar'
import NavigationPanel from '../Navigation/NavigationPanel'
import TrafficSignalOverlay from '../TrafficSignals/TrafficSignalOverlay'

const MapContainer = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const geolocateRef = useRef<any>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [showSearch, setShowSearch] = useState(true)
  const [showNavigation, setShowNavigation] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [webglError, setWebglError] = useState<string | null>(null)

  // Check WebGL support
  const checkWebGLSupport = (): boolean => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (!gl || !(gl instanceof WebGLRenderingContext)) {
        setWebglError('WebGL is not supported on this device/browser')
        return false
      }
      
      // Check for required WebGL extensions
      const requiredExtensions = ['OES_element_index_uint']
      for (const ext of requiredExtensions) {
        if (!gl.getExtension(ext)) {
          setWebglError(`Required WebGL extension ${ext} is not supported`)
          return false
        }
      }
      
      return true
    } catch (error) {
      setWebglError('Error checking WebGL support: ' + (error as Error).message)
      return false
    }
  }

  const apiKey = import.meta.env.VITE_OLA_MAPS_API_KEY
  const defaultCenter = [
    parseFloat(import.meta.env.VITE_DEFAULT_LNG || '77.1025'),
    parseFloat(import.meta.env.VITE_DEFAULT_LAT || '28.7041')
  ]
  const defaultZoom = parseInt(import.meta.env.VITE_DEFAULT_ZOOM || '12')

  useEffect(() => {
    if (!mapContainerRef.current || !apiKey) return

    const initializeMap = async () => {
      try {
        // Check WebGL support before initializing map
        if (!checkWebGLSupport()) {
          console.error('WebGL not supported, cannot initialize map')
          return
        }

        // Initialize Ola Maps instance
        const olaMaps = new OlaMaps({ apiKey })

        // Use default style instead of fetching styles list
        const defaultStyle = 'default'

        // Initialize map with fallback options
        const map = olaMaps.init({
          styleName: defaultStyle,
          container: mapContainerRef.current,
          center: defaultCenter,
          zoom: defaultZoom,
          // Add WebGL fallback options
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
          antialias: false
        })

        // Add geolocation control
        const geolocate = olaMaps.addGeolocateControls({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        })

        map.addControl(geolocate, 'bottom-right')
        geolocateRef.current = geolocate

        // Add navigation control
        const navControl = olaMaps.addNavigationControls()
        map.addControl(navControl, 'top-right')

        // Map load event
        map.on('load', () => {
          setIsMapLoaded(true)
          // Trigger geolocation on load
          if (geolocateRef.current) {
            geolocateRef.current.trigger()
          }
        })

        // Track user location
        geolocate.on('geolocate', (e: any) => {
          setCurrentLocation({
            lat: e.coords.latitude,
            lng: e.coords.longitude
          })
        })

        mapRef.current = map

      } catch (error) {
        console.error('Error initializing map:', error)
        
        // Check if it's a WebGL-related error
        const errorMessage = (error as Error).message
        if (errorMessage.includes('WebGL') || errorMessage.includes('webgl')) {
          setWebglError('Failed to initialize WebGL context. Your device or browser may not support WebGL.')
        } else {
          setWebglError(`Map initialization failed: ${errorMessage}`)
        }
      }
    }

    initializeMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
      }
    }
  }, [apiKey])

  const addMarker = (coordinates: [number, number], options?: any) => {
    if (!mapRef.current) return

    const olaMaps = new OlaMaps({ apiKey })
    return olaMaps
      .addMarker({ 
        offset: options?.offset || [0, 0], 
        anchor: options?.anchor || 'bottom',
        color: options?.color || '#0066CC' // Default blue color for search markers
      })
      .setLngLat(coordinates)
      .addTo(mapRef.current)
  }

  const flyToLocation = (coordinates: [number, number], zoom?: number) => {
    if (!mapRef.current) return

    mapRef.current.flyTo({
      center: coordinates,
      zoom: zoom || 15,
      essential: true
    })
  }

  return (
    <div className="relative h-screen w-screen">
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-4 left-4 right-4 z-10 md:left-4 md:right-auto md:w-96">
          <SearchBar 
            onLocationSelect={(location) => {
              flyToLocation([location.lng, location.lat])
              addMarker([location.lng, location.lat])
            }}
            currentLocation={currentLocation}
          />
        </div>
      )}

      {/* Navigation Panel */}
      {showNavigation && (
        <div className="absolute left-4 top-20 bottom-4 z-10 w-80 md:w-96">
          <NavigationPanel 
            map={mapRef.current}
            onClose={() => setShowNavigation(false)}
            currentLocation={currentLocation}
          />
        </div>
      )}

      {/* Enhanced Traffic Signal Overlay */}
      {isMapLoaded && currentLocation && (
        <TrafficSignalOverlay 
          map={mapRef.current}
          currentLocation={currentLocation}
        />
      )}

      {/* Control Buttons */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="bg-white hover:bg-gray-50 p-3 rounded-lg shadow-lg transition-colors"
          title="Toggle Search"
        >
          <Search className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setShowNavigation(!showNavigation)}
          className="bg-white hover:bg-gray-50 p-3 rounded-lg shadow-lg transition-colors"
          title="Navigation"
        >
          <Navigation className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            if (currentLocation) {
              flyToLocation([currentLocation.lng, currentLocation.lat], 16)
            }
          }}
          className="bg-ola-green hover:bg-green-600 text-white p-3 rounded-lg shadow-lg transition-colors"
          title="My Location"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>

      {/* Map Style Toggle */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          className="bg-white hover:bg-gray-50 p-3 rounded-lg shadow-lg transition-colors"
          title="Map Layers"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* WebGL Error Message */}
      {webglError && (
        <div className="absolute inset-0 z-20 bg-white flex items-center justify-center">
          <div className="text-center max-w-md mx-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <h3 className="font-bold text-lg mb-2">Map Not Available</h3>
              <p className="text-sm">{webglError}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
              <h4 className="font-semibold mb-2">Solutions:</h4>
              <ul className="text-sm text-left space-y-1">
                <li>• Update your browser to the latest version</li>
                <li>• Enable hardware acceleration in browser settings</li>
                <li>• Try a different browser (Chrome, Firefox, Safari)</li>
                <li>• Check if WebGL is disabled in your browser</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {!isMapLoaded && !webglError && (
        <div className="absolute inset-0 z-20 bg-white bg-opacity-90 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ola-green mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Ola Maps...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapContainer