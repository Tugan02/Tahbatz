# Tahbatz
# HERE Route MVP (Vite + TypeScript + HERE Maps JS SDK)

Features:
- Interactive HERE map
- "Find me" (browser Geolocation) to set origin
- Destination by address or `lat,lon` (geocoding via HERE Geocoding & Search)
- Car route drawing via HERE Routing v8 (polyline + summary)

## Setup

1. **Install deps**
```bash
npm i react react-dom
npm i -D @types/react @types/react-dom @vitejs/plugin-react
npm i
npm run dev