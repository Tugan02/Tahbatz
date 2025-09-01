import React, { useEffect, useRef, useState } from 'react'
import { decode } from '@here/flexpolyline'

type LatLng = { lat: number; lng: number }

declare const H: any

const API_KEY = import.meta.env.VITE_HERE_API_KEY

const autosuggest = async (query: string,  at: { lat: number; lng: number },
  signal?: AbortSignal) => {
  const url = new URL("https://autosuggest.search.hereapi.com/v1/autosuggest");
  url.searchParams.set("q", query);
  url.searchParams.set("apiKey", API_KEY);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "he");
  url.searchParams.set("at", `${at.lat},${at.lng}`); 

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
};


function useHereMap(containerId: string, center: LatLng, zoom = 13) {
  const mapRef = useRef<any>(null)
  const platformRef = useRef<any>(null)
  const uiRef = useRef<any>(null)
  const behaviorRef = useRef<any>(null)

  useEffect(() => {
    if (!API_KEY) {
      console.error('Missing VITE_HERE_API_KEY')
      return
    }
    const platform = new H.service.Platform({ apikey: API_KEY })
    const defaultLayers = platform.createDefaultLayers()
    const container = document.getElementById(containerId)!
    const map = new H.Map(container, defaultLayers.vector.normal.map, {
      center,
      zoom,
      pixelRatio: window.devicePixelRatio || 1
    })
    window.addEventListener('resize', () => map.getViewPort().resize())
    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map))
    const ui = H.ui.UI.createDefault(map, defaultLayers)
    platformRef.current = platform
    mapRef.current = map
    uiRef.current = ui
    behaviorRef.current = behavior
    return () => {
      map.dispose()
    }
  }, [containerId])

  return { mapRef, platformRef, uiRef, behaviorRef }
}

function metersToKm(m:number){return (m/1000).toFixed(2)}

export default function App() {
  const { mapRef, platformRef } = useHereMap('map', { lat: 32.0853, lng: 34.7818 }, 13)

  const [origin, setOrigin] = useState<LatLng | null>(null)
  const [destination, setDestination] = useState<LatLng | null>(null)
  const [destQuery, setDestQuery] = useState('')
  const [clickToSetDest, setClickToSetDest] = useState(false)
  const [summary, setSummary] = useState<string>('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)

  const autosuggestAbortRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const originMarkerRef = useRef<any>(null)
  const destMarkerRef = useRef<any>(null)
  const routeGroupRef = useRef<any>(new H.map.Group())

  const onDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setDestQuery(q)
    setSuggestions([])

    if (/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(q)) return

    if (q.trim().length < 3) {
      if (autosuggestAbortRef.current) autosuggestAbortRef.current.abort()
      return
    }

    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        if (autosuggestAbortRef.current) autosuggestAbortRef.current.abort()
        const ctrl = new AbortController()
        autosuggestAbortRef.current = ctrl

        setIsSuggesting(true)
        const at = origin ?? { lat: 32.0853, lng: 34.7818 }
        const items = await autosuggest(q, at, ctrl.signal)
        setSuggestions(items)
      } catch (err) {
        if ((err as any).name !== 'AbortError') console.error('autosuggest error', err)
      } finally {
        setIsSuggesting(false)
      }
    }, 250)
  }

  // attach group once map exists
  useEffect(() => {
    const map = mapRef.current
    if (map && routeGroupRef.current) {
      map.addObject(routeGroupRef.current)
    }
  }, [mapRef.current])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onTap = (ev:any) => {
      if (!clickToSetDest) return
      const coord = map.screenToGeo(ev.currentPointer.viewportX, ev.currentPointer.viewportY)
      setDestination({ lat: coord.lat, lng: coord.lng })
      setClickToSetDest(false)
    }
    map.addEventListener('tap', onTap)
    return () => map.removeEventListener('tap', onTap)
  }, [clickToSetDest])

  const setMarker = (pos:LatLng, isOrigin:boolean) => {
    const map = mapRef.current
    if (!map) return
    const marker = new H.map.Marker(pos)
    if (isOrigin) {
      if (originMarkerRef.current) map.removeObject(originMarkerRef.current)
      originMarkerRef.current = marker
    } else {
      if (destMarkerRef.current) map.removeObject(destMarkerRef.current)
      destMarkerRef.current = marker
    }
    map.addObject(marker)
  }

  const fitToObjects = () => {
    const map = mapRef.current
    if (!map) return
    const objs:any[] = []
    if (originMarkerRef.current) objs.push(originMarkerRef.current)
    if (destMarkerRef.current) objs.push(destMarkerRef.current)
    if (routeGroupRef.current) objs.push(routeGroupRef.current)
    if (objs.length) {
      const bounding = objs.reduce((acc:any, obj:any) => (acc ? acc.merge(obj.getBoundingBox()) : obj.getBoundingBox()), null)
      if (bounding) map.getViewModel().setLookAtData({ bounds: bounding, padding: 40 })
    }
  }

  const onFindMe = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const p = { lat: latitude, lng: longitude }
        setOrigin(p)
        setMarker(p, true)
        const map = mapRef.current
        if (map) map.setCenter(p), map.setZoom(15)
      },
      (err) => {
        alert('Failed to get location: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const geocode = async (q:string): Promise<LatLng | null> => {
    if (!API_KEY) return null
    const url = new URL('https://geocode.search.hereapi.com/v1/geocode')
    url.searchParams.set('q', q)
    url.searchParams.set('apiKey', API_KEY)
    const r = await fetch(url.toString())
    if (!r.ok) throw new Error('Geocoding failed')
    const j = await r.json()
    const item = j.items?.[0]
    if (!item) return null
    return { lat: item.position.lat, lng: item.position.lng }
  }

  const drawRoute = (coords: Array<[number, number]>) => {
    const map = mapRef.current
    if (!map) return
    // build LineString
    const line = new H.geo.LineString()
    coords.forEach(([lat, lng]) => line.pushLatLngAlt(lat, lng, 0))
    const poly = new H.map.Polyline(line, { style: { lineWidth: 5 } })
    routeGroupRef.current.removeAll()
    routeGroupRef.current.addObject(poly)
  }

  const computeRoute = async () => {
    if (!origin || !destination) {
      alert('Please set both origin and destination.')
      return
    }
    if (!API_KEY) {
      alert('Missing HERE API key')
      return
    }
    setSummary('Calculating route...')
    const url = new URL('https://router.hereapi.com/v8/routes')
    url.searchParams.set('transportMode', 'car')
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`)
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`)
    url.searchParams.set('return', 'polyline,summary')
    url.searchParams.set('departureTime', 'now')
    url.searchParams.set('apiKey', API_KEY)

    const res = await fetch(url.toString())
    if (!res.ok) {
      setSummary('Routing failed.')
      return
    }
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route) { setSummary('No route found.'); return }
    // sections[0].polyline is flexible polyline string
    const poly = route.sections?.[0]?.polyline || route.polyline
    if (!poly) { setSummary('No polyline returned.'); return }
    const coords = decode(poly) as Array<[number, number]>
    drawRoute(coords)

    // summary
    const secSummary = route.sections?.[0]?.summary || route.summary
    const durSec = secSummary?.duration ?? 0
    const lenM = secSummary?.length ?? 0
    setSummary(`Duration ~ ${Math.round(durSec/60)} min, Distance ~ ${metersToKm(lenM)} km.`)
    fitToObjects()
  }

  useEffect(() => {
    if (origin) setMarker(origin, true)
    if (destination) setMarker(destination, false)
  }, [origin, destination])

  return (
    <div style={{height: '100%'}}>
      <div id="map"></div>
      <div className="panel">
      {/* שורת כפתורי מצא/איפוס */}
      <div className="row buttons">
        <button onClick={onFindMe}>📍 מצא אותי</button>
        <button className="secondary" onClick={() => {
          setOrigin(null); setDestination(null); setSummary(''); routeGroupRef.current.removeAll();
        }}>
          איפוס
        </button>
      </div>

      {/* שורת שדה היעד */}
      
      <div className="row field">
        <label>יעד:</label>

        {/* עטיפה לאינפוט ול-dropdown */}
        <div className="field-inputwrap">
          <input
            placeholder="כתובת או lat,lon"
            value={destQuery}
            onChange={onDestChange}  // ← תשאיר את הלוגיקה שלך כאן
          />

          {/* Dropdown ההצעות */}
          {(isSuggesting || suggestions.length > 0) && (
            <div className="suggestions">
              {isSuggesting && suggestions.length === 0 && (
                <div className="suggestion loading">מחפש…</div>
              )}

              {suggestions.map((s, i) => {
                const label = s.address?.label || s.title || "";
                const pos = s.position;
                const isPlace = !!s.position; // לרוב true בהצעות כתובת/מקום
                return (
                  <div
                    key={i}
                    className="suggestion"
                    onMouseDown={(e) => e.preventDefault()} // שלא יאבד פוקוס מה-input
                    onClick={() => {
                      setDestQuery(label);
                      if (pos) setDestination({ lat: pos.lat, lng: pos.lng });
                      setSuggestions([]);
                    }}
                  >
                    <span className={`icon ${isPlace ? "pin" : "history"}`} />
                    <div className="text">{label}</div>
                  </div>
                );
              })}

              {!isSuggesting && suggestions.length === 0 && destQuery.trim().length >= 3 && (
                <div className="suggestion empty">אין הצעות</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* שורת הכפתורים של היעד/חישוב */}
      <div className="dest-actions">
        <button onClick={async ()=>{
          if (!destQuery.trim()) return
          if (/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(destQuery.trim())) {
            const [latS, lonS] = destQuery.split(',')
            const p = { lat: parseFloat(latS), lng: parseFloat(lonS) }
            setDestination(p)
            return
          }
          const p = await geocode(destQuery.trim())
          if (!p) { alert('לא נמצאה כתובת'); return }
          setDestination(p)
        }}>קבע יעד</button>

        <button onClick={()=> setClickToSetDest(v=>!v)} className="secondary">
          {clickToSetDest ? 'בטל בחירה במפה' : 'בחר יעד על המפה'}
        </button>

        <button onClick={computeRoute}>חשב מסלול</button>
      </div>

      <div className="summary">{summary}</div>
      <div className="footer"> הזן כתובת (בעברית/אנגלית) או קואורדינטות.</div>
    </div>

    </div>
  )
}
