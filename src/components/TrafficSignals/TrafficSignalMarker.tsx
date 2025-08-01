import { useEffect, useState } from 'react'

interface TrafficSignalMarkerProps {
  state: 'red' | 'yellow' | 'green'
  countdown: number
  pedestrianWalk: boolean
  onClick?: () => void
}

const TrafficSignalMarker = ({ state, countdown, pedestrianWalk, onClick }: TrafficSignalMarkerProps) => {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    // Blink when countdown is low
    if (countdown <= 5 && state !== 'yellow') {
      setIsBlinking(true)
      const interval = setInterval(() => {
        setIsBlinking(prev => !prev)
      }, 500)
      return () => clearInterval(interval)
    } else {
      setIsBlinking(false)
    }
  }, [countdown, state])

  const getSignalColor = (lightState: 'red' | 'yellow' | 'green') => {
    if (lightState === state) {
      const colors = {
        red: '#ff4444',
        yellow: '#ffaa00', 
        green: '#00ff44'
      }
      return isBlinking ? '#333' : colors[lightState]
    }
    const dimColors = {
      red: '#660000',
      yellow: '#664400',
      green: '#004400'
    }
    return dimColors[lightState]
  }

  const getGlowEffect = (lightState: 'red' | 'yellow' | 'green') => {
    if (lightState === state && !isBlinking) {
      const colors = {
        red: '#ff4444',
        yellow: '#ffaa00',
        green: '#00ff44'
      }
      return `0 0 6px ${colors[lightState]}`
    }
    return 'none'
  }

  return (
    <div 
      className="traffic-signal-marker cursor-pointer"
      onClick={onClick}
      style={{
        position: 'relative',
        width: '24px',
        height: '36px',
        background: '#333',
        borderRadius: '4px',
        border: '2px solid #666',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '2px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}
    >
      {/* Red Light */}
      <div 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getSignalColor('red'),
          boxShadow: getGlowEffect('red')
        }}
      />
      
      {/* Yellow Light */}
      <div 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getSignalColor('yellow'),
          boxShadow: getGlowEffect('yellow')
        }}
      />
      
      {/* Green Light */}
      <div 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getSignalColor('green'),
          boxShadow: getGlowEffect('green')
        }}
      />

      {/* Countdown Timer */}
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          fontSize: '10px',
          padding: '1px 4px',
          borderRadius: '2px',
          fontWeight: 'bold',
          minWidth: '16px',
          textAlign: 'center'
        }}
      >
        {countdown}
      </div>

      {/* Pedestrian Walk Signal */}
      {pedestrianWalk && (
        <div
          style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#00ff44',
            color: 'white',
            fontSize: '8px',
            padding: '1px 3px',
            borderRadius: '2px',
            fontWeight: 'bold'
          }}
        >
          WALK
        </div>
      )}
    </div>
  )
}

export default TrafficSignalMarker