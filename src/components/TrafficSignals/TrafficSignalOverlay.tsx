import { useEffect, useState, useRef } from 'react'
import { OlaMaps } from 'olamaps-web-sdk'

interface TrafficSignal {
  id: string
  lat: number
  lng: number
  name: string
  currentState: 'red' | 'yellow' | 'green' | 'walk'
  countdown: number
  pedestrianWalk: boolean
  cycleCount: number // Track cycles for walk signal timing
  completedCycles: number // Track completed full cycles for walk timing
}

interface TrafficSignalOverlayProps {
  map: any
  currentLocation: { lat: number; lng: number }
}

const TrafficSignalOverlay = ({ map, currentLocation }: TrafficSignalOverlayProps) => {
  const [trafficSignals, setTrafficSignals] = useState<TrafficSignal[]>([])
  const [signalMarkers, setSignalMarkers] = useState<any[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()

  // Helper functions for signal simulation with consistent timing
  const getInitialState = (signalIndex: number): 'red' | 'yellow' | 'green' => {
    // Use different starting states for different signals to create realistic staggering
    const states = ['red', 'green', 'yellow'] as const
    return states[signalIndex % 3]
  }

  const getInitialCountdown = (state: 'red' | 'yellow' | 'green' | 'walk', signalIndex: number): number => {
    // Return random countdown within the proper range for each state
    const baseCountdowns = {
      red: 45,    // Red always lasts exactly 45 seconds
      green: 30,  // Green always lasts exactly 30 seconds  
      yellow: 6,  // Yellow always lasts exactly 6 seconds
      walk: 20    // Walk signal lasts exactly 20 seconds
    }
    
    // Start at random point in the cycle for more realistic simulation
    const maxTime = baseCountdowns[state]
    const minTime = Math.max(5, Math.floor(maxTime * 0.2)) // Start with at least 20% of time remaining
    
    // Use signalIndex as seed for consistent but different starting points
    const seed = (signalIndex * 7 + 13) % (maxTime - minTime + 1)
    return minTime + seed
  }

  useEffect(() => {
    if (!map || !currentLocation) return

    fetchTrafficSignals()
    
    return () => {
      clearSignalsFromMap()
    }
  }, [map, currentLocation])

  // Separate effect for timer - runs once after signals are created
  useEffect(() => {
    if (trafficSignals.length === 0) return

    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Update signal states every second
    intervalRef.current = setInterval(() => {
      updateSignalStates()
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [trafficSignals.length > 0]) // Only restart when signals are first created

  // Update visual elements when signal states change
  useEffect(() => {
    updateSignalVisuals()
  }, [trafficSignals])

  const updateSignalVisuals = () => {
    if (!trafficSignals.length || !signalMarkers.length) return

    signalMarkers.forEach(({ element, signal: markerSignal }) => {
      const currentSignal = trafficSignals.find(s => s.id === markerSignal.id)
      if (!currentSignal || !element) return

      // Update pill toggle elements
      const signalCircle = element.querySelector('.signal-circle') as HTMLElement
      const signalArrow = element.querySelector('.signal-arrow') as HTMLElement
      const timerDisplay = element.querySelector('.timer-display') as HTMLElement
      const walkDot = element.querySelector('.walk-dot') as HTMLElement

      if (signalCircle) {
        // Update circle background color with smooth transition
        const newColor = getSignalBackgroundColor(currentSignal.currentState)
        if (signalCircle.style.background !== newColor) {
          signalCircle.style.background = newColor
          signalCircle.style.transition = 'background 0.3s ease'
        }
      }

      if (signalArrow) {
        // Update arrow/icon
        const newIcon = getSignalIcon(currentSignal.currentState)
        if (signalArrow.textContent !== newIcon) {
          signalArrow.textContent = newIcon
        }
      }

      if (timerDisplay) {
        // Force update timer text every time
        const newTimerText = currentSignal.countdown.toString()
        timerDisplay.textContent = newTimerText
        
        // Add pulsing animation for urgency
        if (currentSignal.countdown <= 5) {
          timerDisplay.style.animation = 'timer-pulse 1s infinite'
          timerDisplay.style.color = '#FF3B30' // Red color for urgency
        } else {
          timerDisplay.style.animation = 'none'
          timerDisplay.style.color = 'white' // Normal white color
        }
        
        // Force DOM repaint
        timerDisplay.style.transform = 'translateZ(0)'
      }

      // Handle walk indicator dot
      if (currentSignal.pedestrianWalk && !walkDot) {
        // Add walk dot if pedestrian signal is active
        const walkElement = document.createElement('div')
        walkElement.className = 'walk-dot'
        walkElement.style.cssText = `
          position: absolute;
          bottom: -4px;
          right: 2px;
          width: 6px;
          height: 6px;
          background: #00C851;
          border-radius: 50%;
          border: 1px solid white;
          animation: walk-blink 1s infinite;
        `
        element.appendChild(walkElement)
      } else if (!currentSignal.pedestrianWalk && walkDot) {
        // Remove walk dot if no longer active
        walkDot.remove()
      }
    })
  }

  const updateSignalStates = () => {
    setTrafficSignals(prev => prev.map(signal => {
      let newCountdown = signal.countdown - 1
      let newState = signal.currentState
      let newPedestrianWalk = false
      let newCycleCount = signal.cycleCount
      let newCompletedCycles = signal.completedCycles || 0

      // When countdown reaches 0, change state according to the exact sequence
      if (newCountdown <= 0) {
        switch (signal.currentState) {
          case 'red':
            // Red (45s) → Green (30s)
            newState = 'green'
            newCountdown = 30
            console.log(`Signal ${signal.id}: Red → Green, countdown: ${newCountdown}`)
            break
            
          case 'green':
            // Green (30s) → Yellow (6s)  
            newState = 'yellow'
            newCountdown = 6
            console.log(`Signal ${signal.id}: Green → Yellow, countdown: ${newCountdown}`)
            break
            
          case 'yellow':
            // Yellow (6s) → Check if 2 cycles completed for walk signal
            newCompletedCycles = newCompletedCycles + 1
            
            if (newCompletedCycles >= 2) {
              // After 2 complete cycles, show walk signal for 20 seconds
              newState = 'walk'
              newCountdown = 20
              newPedestrianWalk = true
              newCompletedCycles = 0 // Reset completed cycles
              console.log(`Signal ${signal.id}: Yellow → Walk (after 2 cycles), countdown: ${newCountdown}`)
            } else {
              // Normal cycle: Yellow → Red (45s)
              newState = 'red'
              newCountdown = 45
              console.log(`Signal ${signal.id}: Yellow → Red, countdown: ${newCountdown}, completed cycles: ${newCompletedCycles}`)
            }
            break
            
          case 'walk':
            // Walk (20s) → Red (45s) to start new cycle
            newState = 'red'
            newCountdown = 45
            newPedestrianWalk = false
            console.log(`Signal ${signal.id}: Walk → Red, countdown: ${newCountdown}`)
            break
        }
      } else {
        // Maintain pedestrian walk state during walk phase
        if (signal.currentState === 'walk') {
          newPedestrianWalk = true
        }
        
        // Debug logging for countdown
        if (signal.countdown % 10 === 0 || signal.countdown <= 5) {
          console.log(`Signal ${signal.id}: ${signal.currentState} countdown: ${newCountdown}`)
        }
      }

      return {
        ...signal,
        currentState: newState,
        countdown: newCountdown,
        pedestrianWalk: newPedestrianWalk,
        cycleCount: newCycleCount,
        completedCycles: newCompletedCycles
      }
    }))
  }

  const fetchTrafficSignals = async () => {
    console.log('Starting traffic signal detection...')
    
    // For demo reliability, create sample signals around current location
    if (currentLocation) {
      console.log('Creating demo traffic signals around current location')
      createDemoSignals(currentLocation)
    } else {
      // Default demo location (Delhi/Bangalore area)
      const defaultLocation = { lat: 28.7041, lng: 77.1025 }
      console.log('Creating demo traffic signals at default location')
      createDemoSignals(defaultLocation)
    }
    
    // Still try to detect real signals as fallback
    setTimeout(async () => {
      await detectExistingSignals()
    }, 2000)
  }

  const createDemoSignals = (location: { lat: number; lng: number }) => {
    const demoSignals: TrafficSignal[] = []
    
    // Create 4 demo signals with different starting states
    for (let i = 0; i < 4; i++) {
      const initialState = getInitialState(i)
      const signal: TrafficSignal = {
        id: `demo_signal_${i + 1}`,
        lat: location.lat + (i % 2 === 0 ? 0.001 : -0.001) * (i + 1),
        lng: location.lng + (i < 2 ? 0.001 : -0.001) * (i + 1),
        name: `Traffic Signal ${i + 1}`,
        currentState: initialState,
        countdown: getInitialCountdown(initialState, i),
        pedestrianWalk: false,
        cycleCount: 0,
        completedCycles: 0
      }
      demoSignals.push(signal)
    }

    console.log(`Creating ${demoSignals.length} demo traffic signals with quick timers for demo`)
    setTrafficSignals(demoSignals)
    addEnhancedSignalsToMap(demoSignals)
  }

  const detectExistingSignals = async () => {
    if (!map) return

    console.log('Starting global traffic signal detection...')

    try {
      // Method 1: Comprehensive DOM search for ALL traffic signal patterns
      console.log('Method 1: Comprehensive DOM search...')
      const domSignals = findAllTrafficSignalIcons()
      if (domSignals.length > 0) {
        console.log('✅ Found traffic signal icons via DOM search:', domSignals.length)
        enhanceAllSignals(domSignals)
        return
      }

      // Method 2: Query all map features and find traffic-related ones
      console.log('Method 2: Query all map features...')
      const features = await queryAllMapFeatures()
      if (features.length > 0) {
        console.log('✅ Found traffic signals via map features:', features.length)
        enhanceAllSignals(features)
        return
      }

      // Method 3: Broad POI search
      console.log('Method 3: Broad POI search...')
      const poiData = await queryAllPOIData()
      if (poiData.length > 0) {
        console.log('✅ Found traffic signals via POI:', poiData.length)
        enhanceAllSignals(poiData)
        return
      }

      console.log('No traffic signals found - trying fallback detection')
      // Fallback: Look for any potential signal patterns
      setTimeout(() => detectExistingSignals(), 2000)
      
    } catch (error) {
      console.error('Error detecting traffic signals:', error)
      // Retry after error
      setTimeout(() => detectExistingSignals(), 3000)
    }
  }

  const queryAllMapFeatures = async (): Promise<any[]> => {
    try {
      console.log('Querying ALL map features for traffic patterns...')
      
      if (map.queryRenderedFeatures) {
        // Get ALL rendered features
        const allFeatures = map.queryRenderedFeatures()
        console.log('Total rendered features:', allFeatures?.length || 0)
        
        // Look for ANY traffic-related features with broad criteria
        const trafficRelated = allFeatures?.filter((feature: any) => {
          const props = feature.properties || {}
          const layer = feature.layer || {}
          
          // BROAD criteria - look for anything traffic-related
          const couldBeTrafficSignal = 
            // Explicit traffic signals
            props.class === 'traffic_signals' ||
            props.type === 'traffic_signals' ||
            props.subclass === 'traffic_signals' ||
            props.amenity === 'traffic_signals' ||
            props.highway === 'traffic_signals' ||
            // Layer contains traffic/signal/poi
            layer.id?.includes('traffic') ||
            layer.id?.includes('signal') ||
            layer.id?.includes('poi') ||
            layer.id?.includes('symbol') ||
            // Properties mention traffic/signal
            props.name?.toLowerCase()?.includes('traffic') ||
            props.name?.toLowerCase()?.includes('signal') ||
            // Any POI that could be a signal
            props.class === 'poi' ||
            layer.type === 'symbol'
          
          return couldBeTrafficSignal
        }) || []
        
        console.log('Traffic-related features found:', trafficRelated.length)
        if (trafficRelated.length > 0) {
          return trafficRelated
        }
        
        // Try ALL possible layers that might contain signals
        const layersToSearch = [
          'poi-traffic-light', 'poi-traffic-signal', 'traffic-signals', 'traffic_signals',
          'poi', 'symbols', 'places', 'poi-label', 'symbol', 'icon',
          'poi-scalerank1', 'poi-scalerank2', 'poi-scalerank3', 'poi-scalerank4'
        ]
        
        for (const layerId of layersToSearch) {
          try {
            const layerFeatures = map.queryRenderedFeatures(undefined, {
              layers: [layerId]
            })
            
            if (layerFeatures && layerFeatures.length > 0) {
              console.log(`Found ${layerFeatures.length} features in layer ${layerId}`)
              // Return ALL features from POI/symbol layers
              if (layerId.includes('poi') || layerId.includes('symbol')) {
                return layerFeatures
              }
            }
          } catch (layerError) {
            console.log(`Layer ${layerId} query failed:`, layerError)
          }
        }
      }
      
    } catch (error) {
      console.log('queryAllMapFeatures failed:', error)
    }
    return []
  }

  const findAllTrafficSignalIcons = (): any[] => {
    try {
      const mapContainer = map.getContainer()
      if (!mapContainer) return []

      console.log('Searching for ALL traffic signal icons globally...')

      // Comprehensive search for ANY traffic signal icons
      const allSignalSelectors = [
        // Images with traffic signal patterns
        'img[src*="traffic"]',
        'img[src*="signal"]',
        'img[src*="light"]',
        'img[alt*="traffic"]',
        'img[alt*="signal"]',
        'img[title*="traffic"]',
        'img[title*="signal"]',
        // SVG elements with traffic patterns
        'svg[class*="traffic"]',
        'svg[class*="signal"]',
        'svg[id*="traffic"]',
        'svg[id*="signal"]',
        // Div elements with traffic classes
        'div[class*="traffic"]',
        'div[class*="signal"]',
        'div[id*="traffic"]',
        'div[id*="signal"]',
        // Data attributes
        '[data-poi*="traffic"]',
        '[data-type*="traffic"]',
        '[data-amenity*="traffic"]',
        '[data-highway*="signal"]',
        // Ola/Mapbox specific markers
        '.ola-marker',
        '.mapbox-marker',
        '.marker',
        // POI elements
        '[class*="poi"]',
        // Generic icon containers that might be signals
        '.icon',
        '.symbol',
        '.pin'
      ]

      const signals: any[] = []
      
      allSignalSelectors.forEach(selector => {
        try {
          const elements = mapContainer.querySelectorAll(selector)
          console.log(`Selector "${selector}" found ${elements.length} elements`)
          
          elements.forEach((element: Element) => {
            const rect = element.getBoundingClientRect()
            const mapRect = mapContainer.getBoundingClientRect()
            
            // Only consider visible elements
            if (rect.width > 0 && rect.height > 0 && rect.width < 200 && rect.height < 200) {
              // Skip if already enhanced
              if (element.closest('.enhanced-traffic-signal')) {
                return
              }
              
              const point = map.unproject([
                rect.left - mapRect.left + rect.width / 2,
                rect.top - mapRect.top + rect.height / 2
              ])

              signals.push({
                id: `global_signal_${signals.length}`,
                lat: point.lat,
                lng: point.lng,
                name: `Traffic Signal ${signals.length + 1}`,
                element: element,
                selector: selector
              })
            }
          })
        } catch (selectorError) {
          console.log(`Selector ${selector} failed:`, selectorError)
        }
      })

      console.log(`Found ${signals.length} potential traffic signal icons globally`)
      return signals
    } catch (error) {
      console.log('findAllTrafficSignalIcons failed:', error)
      return []
    }
  }

  // Removed restrictive element validation - now enhancing ALL detected icons

  const queryAllPOIData = async (): Promise<any[]> => {
    try {
      // Get current map bounds and query for ALL POIs
      const bounds = map.getBounds()
      
      // Try Ola Maps API for ALL POI types
      if (map.queryPOI) {
        console.log('Querying ALL POI data...')
        const allPOIs = await map.queryPOI({
          bounds: bounds,
          types: ['traffic_signals', 'poi', 'amenity', 'highway'], // All possible types
          limit: 100 // Higher limit
        })
        
        console.log(`Found ${allPOIs?.length || 0} POIs total`)
        return allPOIs || []
      }
      
      // Try alternative methods
      if (map.queryFeatures) {
        console.log('Trying queryFeatures for POIs...')
        return await map.queryFeatures({
          bounds: bounds,
          types: ['poi', 'symbol'],
          limit: 100
        })
      }
    } catch (error) {
      console.log('queryAllPOIData failed:', error)
    }
    return []
  }

  // Global traffic signal detection and enhancement

  // Global signal enhancement - no restrictive validation

  const enhanceAllSignals = (signalData: any[]) => {
    // Enhance ALL detected signals without restrictive validation
    console.log(`Enhancing ${signalData.length} signals globally...`)
    
    const enhancedSignals: TrafficSignal[] = signalData.map((signal, index) => {
      const initialState = getInitialState(index)
      return {
        id: signal.id || `global_signal_${index}`,
        lat: signal.lat || signal.geometry?.coordinates?.[1] || signal.latlng?.lat,
        lng: signal.lng || signal.geometry?.coordinates?.[0] || signal.latlng?.lng,
        name: signal.name || signal.properties?.name || `Traffic Signal ${index + 1}`,
        currentState: initialState,
        countdown: getInitialCountdown(initialState, index),
        pedestrianWalk: false,
        cycleCount: 0,
        completedCycles: 0
      }
    }).filter(signal => signal.lat && signal.lng)

    console.log(`Enhanced ${enhancedSignals.length} traffic signals globally`)

    if (enhancedSignals.length > 0) {
      setTrafficSignals(enhancedSignals)
      addEnhancedSignalsToMap(enhancedSignals)
    } else {
      console.log('No signals to enhance, retrying detection...')
      // Retry detection after a delay
      setTimeout(() => detectExistingSignals(), 2000)
    }
  }

  const addEnhancedSignalsToMap = (signals: TrafficSignal[]) => {
    if (!map) return

    const signalElements = signals.map(signal => {
      // Create toggle/slider style signal element
      const signalElement = document.createElement('div')
      signalElement.className = 'enhanced-traffic-signal'
      signalElement.innerHTML = `
        <!-- Pill-shaped Traffic Signal Toggle -->
        <div class="pill-toggle" style="
          background: rgba(0, 0, 0, 0.85);
          border-radius: 20px;
          padding: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
        ">
          
          <!-- Signal State Circle -->
          <div class="signal-circle" style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${getSignalBackgroundColor(signal.currentState)};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: 2px solid rgba(255,255,255,0.9);
          ">
            <!-- Arrow Icon -->
            <div class="signal-arrow" style="
              color: white;
              font-size: 12px;
              font-weight: bold;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            ">${getSignalIcon(signal.currentState)}</div>
          </div>
          
          <!-- Timer Display -->
          <div class="timer-display" style="
            color: white;
            font-size: 16px;
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            padding-right: 8px;
            min-width: 20px;
            text-align: center;
            ${signal.countdown <= 5 ? 'animation: timer-pulse 1s infinite;' : ''}
          ">${signal.countdown}</div>
          
        </div>
        
        <!-- Walk Indicator (if active) -->
        ${signal.pedestrianWalk ? `
          <div class="walk-dot" style="
            position: absolute;
            bottom: -4px;
            right: 2px;
            width: 6px;
            height: 6px;
            background: #00C851;
            border-radius: 50%;
            border: 1px solid white;
            animation: walk-blink 1s infinite;
          "></div>
        ` : ''}
      `

      // Add improved CSS animations
      if (!document.getElementById('modern-signal-animations')) {
        const style = document.createElement('style')
        style.id = 'modern-signal-animations'
        style.textContent = `
          @keyframes timer-pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes walk-blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
          }
          
          .enhanced-traffic-signal:hover .pill-toggle {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          }
          
          .enhanced-traffic-signal:hover .signal-circle {
            transform: scale(1.1);
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          }
          
          .pill-toggle {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
          }
          
          .signal-circle {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .timer-display {
            transition: all 0.2s ease;
          }
          
          .signal-arrow {
            transition: all 0.2s ease;
          }
        `
        document.head.appendChild(style)
      }

      // Create marker with clean design
      const apiKey = import.meta.env.VITE_OLA_MAPS_API_KEY
      const olaMaps = new OlaMaps({ apiKey })
      const marker = olaMaps
        .addMarker({
          offset: [0, -10],
          anchor: 'bottom',
          element: signalElement
        })
        .setLngLat([signal.lng, signal.lat])
        .addTo(map)

      return { marker, signal, element: signalElement }
    })

    setSignalMarkers(signalElements)
  }

  const getSignalBackgroundColor = (state: 'red' | 'yellow' | 'green' | 'walk'): string => {
    const colors = {
      red: '#FF3B30',     // Modern iOS red
      yellow: '#FF9500',  // Modern iOS orange/yellow
      green: '#30D158',   // Modern iOS green
      walk: '#007AFF'     // Modern iOS blue for walk signal
    }
    return colors[state]
  }

  const getSignalIcon = (state: 'red' | 'yellow' | 'green' | 'walk'): string => {
    const icons = {
      red: '■',        // Stop symbol
      yellow: '▲',     // Caution/warning
      green: '↑',      // Up arrow for go
      walk: '🚶'       // Walking person for walk signal
    }
    return icons[state]
  }

  const clearSignalsFromMap = () => {
    signalMarkers.forEach(({ marker }) => {
      if (marker && marker.remove) {
        marker.remove()
      }
    })
    setSignalMarkers([])
    setTrafficSignals([])
  }

  return null // This component only manages map overlays
}

export default TrafficSignalOverlay