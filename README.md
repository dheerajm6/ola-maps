# Ola Maps Alternative

A modern, feature-rich mapping application built with React, TypeScript, and the Ola Maps SDK. This application provides comprehensive navigation services with enhanced user experience and environmental consciousness.

## 🌟 Features

### 🗺️ Interactive Mapping
- **Ola Maps Integration** - Powered by Ola Maps SDK for accurate Indian road data
- **Real-time Location** - GPS-based current location detection
- **Interactive Controls** - Zoom, pan, and location controls
- **Responsive Design** - Works seamlessly on desktop and mobile

### 🧭 Smart Navigation
- **Multi-modal Routing** - Support for Car, E-Scooter, Cycling, and Walking
- **Real-time Directions** - Turn-by-turn navigation with voice guidance
- **Route Optimization** - Multiple route options with traffic considerations
- **Live Traffic Data** - Real-time traffic information and alternate routes

### 🚦 Dynamic Traffic Signals
- **Intelligent Signal Detection** - Automatically identifies traffic signals on Ola Maps
- **Real-time Timer Display** - Shows countdown timers for all signal phases
- **Pill-shaped UI Design** - Modern toggle interface with colored indicators
- **Realistic Timing Patterns**:
  - Red phase: 45 seconds
  - Green phase: 30 seconds  
  - Yellow phase: 6 seconds
  - Walk signals: Every 2 cycles (30 seconds)

### 🌱 Environmental Impact Calculator
- **Carbon Footprint Tracking** - Real-time CO₂ emissions calculation
- **Transport Mode Comparison** - Shows environmental impact of different travel modes
- **Emission Factors**:
  - Car: 0.21 kg CO₂/km
  - E-Scooter: 0.05 kg CO₂/km
  - Cycling/Walking: 0.0 kg CO₂/km (Zero emissions)
- **Eco-friendly Recommendations** - Encourages sustainable transport choices

### 🔍 Advanced Search
- **Places Autocomplete** - Smart search with location suggestions
- **Current Location Integration** - Use current position as origin/destination
- **Place Details** - Comprehensive information about searched locations
- **Nearby Search** - Discover places around your location

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Maps**: Ola Maps Web SDK
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Database**: Supabase (for user data and preferences)

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Ola Maps API credentials (API Key, Client ID, Client Secret)
- Supabase project (optional, for user features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ola-maps
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in root directory:
   ```env
   VITE_OLA_MAPS_API_KEY=your_ola_maps_api_key
   VITE_OLA_MAPS_CLIENT_ID=your_client_id
   VITE_OLA_MAPS_CLIENT_SECRET=your_client_secret
   
   # Optional: Default map position
   VITE_DEFAULT_LAT=28.7041
   VITE_DEFAULT_LNG=77.1025
   VITE_DEFAULT_ZOOM=12
   
   # Optional: Supabase integration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📱 Usage

### Basic Navigation
1. **Search for places** using the search bar
2. **Set origin and destination** in the navigation panel
3. **Choose transport mode** (Car, E-Scooter, Cycling, Walking)
4. **View route options** with distance, time, and environmental impact
5. **Follow turn-by-turn directions**

### Traffic Signal Features
- **View live traffic signals** on the map with dynamic timers
- **Monitor signal phases** - Red, Yellow, Green, and Walk indicators
- **Plan timing** based on real signal countdown data

### Environmental Insights
- **Compare transport modes** and their CO₂ emissions
- **Make eco-friendly choices** with zero-emission options highlighted
- **Track your carbon savings** when choosing sustainable transport

## 🎨 Design Philosophy

### Cognitive-Centered Design
- **Primary focus on navigation** - Clean, distraction-free interface
- **Progressive information disclosure** - Details appear when needed
- **Reduced cognitive load** - Minimal visual clutter
- **Intuitive user flows** - Natural interaction patterns

### Visual Hierarchy
1. **Primary**: Route information (distance, time, directions)
2. **Secondary**: Traffic conditions and transport options  
3. **Tertiary**: Environmental impact and additional features

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── Map/
│   │   └── MapContainer.tsx          # Main map component
│   ├── Navigation/
│   │   └── NavigationPanel.tsx       # Route planning and directions
│   ├── Search/
│   │   └── SearchBar.tsx             # Place search functionality
│   ├── TrafficSignals/
│   │   ├── TrafficSignalMarker.tsx   # Individual signal display
│   │   └── TrafficSignalOverlay.tsx  # Signal detection and management
│   └── UI/
│       └── LoadingSpinner.tsx        # Loading states
├── services/
│   ├── olaApi.ts                     # Ola Maps API integration
│   ├── supabase.ts                   # Database operations
│   └── index.ts                      # Service exports
├── types/
│   └── index.ts                      # TypeScript definitions
└── utils/                            # Utility functions
```

### Key Services
- **OLA Maps API**: Routing, geocoding, places, traffic data
- **Traffic Signal Detection**: Automated POI identification and enhancement
- **Carbon Calculator**: Real-time emission calculations
- **Route Optimization**: Multi-modal pathfinding

## 🌍 Environmental Impact

This application promotes sustainable transportation by:
- **Visualizing environmental costs** of different transport modes
- **Encouraging eco-friendly choices** through UI design
- **Providing zero-emission alternatives** (walking, cycling)
- **Showing real-time CO₂ savings** when choosing green transport

## 🛣️ Roadmap

### Upcoming Features
- **Offline Maps** - Download maps for offline use
- **Voice Navigation** - Audio turn-by-turn guidance  
- **Traffic Predictions** - AI-powered traffic forecasting
- **Route Sharing** - Share routes with friends and family
- **Public Transit Integration** - Bus, metro, and train options
- **Parking Information** - Real-time parking availability

### Technical Improvements
- **Performance Optimization** - Faster map rendering and routing
- **PWA Support** - Install as mobile/desktop app
- **Advanced Caching** - Offline route caching
- **API Rate Limiting** - Smart request management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ola Maps** - For providing comprehensive mapping services for India
- **React Community** - For the excellent ecosystem and tools
- **Tailwind CSS** - For the utility-first CSS framework
- **Lucide** - For the beautiful icon set

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for sustainable and intelligent transportation in India.