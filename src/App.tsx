import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MapContainer from './components/Map/MapContainer'

function App() {
  return (
    <Router>
      <div className="h-screen w-screen overflow-hidden">
        <Routes>
          <Route path="/" element={<MapContainer />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App