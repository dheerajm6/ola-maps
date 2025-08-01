import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Clock, Star, Locate } from 'lucide-react'
import { olaApi } from '../../services'

interface SearchResult {
  place_id: string
  name: string
  address: string
  location: { lat: number; lng: number }
  rating?: number
  place_type: string
}

interface SearchBarProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; name: string }) => void
  currentLocation?: { lat: number; lng: number } | null
  showLocateButton?: boolean
  hasSelectedLocation?: boolean
}

const SearchBar = ({ onLocationSelect, currentLocation, showLocateButton = false, hasSelectedLocation = false }: SearchBarProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recent_searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    // Handle click outside to close search results
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showResults])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await olaApi.autocomplete(query, currentLocation || undefined)
        
        // Transform Ola Maps response to our SearchResult format
        const transformedResults: SearchResult[] = response.predictions?.map((prediction: any) => ({
          place_id: prediction.place_id,
          name: prediction.structured_formatting?.main_text || prediction.description,
          address: prediction.structured_formatting?.secondary_text || prediction.description,
          location: prediction.geometry?.location || { lat: 0, lng: 0 },
          place_type: prediction.types?.[0] || 'place',
          rating: prediction.rating
        })) || []

        setResults(transformedResults)
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, currentLocation])

  const handleResultSelect = async (result: SearchResult) => {
    try {
      // Get place details if we don't have coordinates
      let location = result.location
      if (!location.lat || !location.lng) {
        const details = await olaApi.getPlaceDetails(result.place_id)
        location = details.result?.geometry?.location || location
      }

      onLocationSelect({
        lat: location.lat,
        lng: location.lng,
        address: result.address,
        name: result.name
      })

      // Add to recent searches
      const updatedRecent = [result, ...recentSearches.filter(r => r.place_id !== result.place_id)].slice(0, 5)
      setRecentSearches(updatedRecent)
      localStorage.setItem('recent_searches', JSON.stringify(updatedRecent))

      setQuery(result.name)
      setShowResults(false)
      inputRef.current?.blur()
    } catch (error) {
      console.error('Error selecting location:', error)
    }
  }

  const handleInputFocus = () => {
    // Only show recent searches if no location is selected and query is empty
    if (query.length === 0 && recentSearches.length > 0 && !hasSelectedLocation) {
      setShowResults(true)
    }
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Only hide if focus is not moving to a result item
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !relatedTarget.closest('.search-results')) {
      setTimeout(() => setShowResults(false), 150)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  const handleLocateMe = async () => {
    if (currentLocation) {
      setIsLoading(true)
      try {
        // Use reverse geocoding to get the actual address
        const response = await olaApi.reverseGeocode(currentLocation.lat, currentLocation.lng)
        const address = response.results?.[0]?.formatted_address || 'Current Location'
        const name = response.results?.[0]?.name || 'Your Location'
        
        onLocationSelect({
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          address: address,
          name: name
        })
        setQuery(name)
        setShowResults(false)
        inputRef.current?.blur()
      } catch (error) {
        console.error('Error getting current address:', error)
        // Fallback to generic location
        onLocationSelect({
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          address: 'Current Location',
          name: 'Your Location'
        })
        setQuery('Your Location')
        setShowResults(false)
        inputRef.current?.blur()
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Search for places, addresses..."
            className="flex-1 outline-none text-gray-800 placeholder-gray-500"
          />
          {showLocateButton && currentLocation && (
            <button
              onClick={handleLocateMe}
              className="ml-2 p-1 text-gray-400 hover:text-ola-green transition-colors"
              title="Use my location"
            >
              <Locate className="w-4 h-4" />
            </button>
          )}
          {query && (
            <button
              onClick={clearSearch}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ola-green"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="search-results absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
          {query.length === 0 && recentSearches.length > 0 && (
            <>
              <div className="px-4 py-2 text-sm font-medium text-gray-500 border-b">
                Recent Searches
              </div>
              {recentSearches.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleResultSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center"
                >
                  <Clock className="w-4 h-4 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.name}</div>
                    <div className="text-sm text-gray-500">{result.address}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {results.length > 0 && (
            <>
              {query.length > 0 && recentSearches.length > 0 && (
                <div className="px-4 py-2 text-sm font-medium text-gray-500 border-b">
                  Search Results
                </div>
              )}
              {results.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleResultSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center"
                >
                  <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.name}</div>
                    <div className="text-sm text-gray-500">{result.address}</div>
                    {result.rating && (
                      <div className="flex items-center mt-1">
                        <Star className="w-3 h-3 text-yellow-400 mr-1" />
                        <span className="text-xs text-gray-600">{result.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 capitalize">
                    {result.place_type.replace('_', ' ')}
                  </div>
                </button>
              ))}
            </>
          )}

          {query.length >= 2 && results.length === 0 && !isLoading && (
            <div className="px-4 py-6 text-center text-gray-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar