import React, { useEffect, useRef, useState } from 'react'
import TopBar from '../components/TopBar'
import DestinationField from '../components/DestinationField'
import { useHereMap } from '../map/HereMap'
import { apiRoute } from '../services/api'

declare const H: any
type LatLng = { lat:number; lng:number }

function metersToKm(m:number){return (m/1000).toFixed(2)}

export default function App() {
  const { mapRef } = useHereMap('map', { lat: 32.0853, lng: 34.7818 }, 13)

  const [origin, setOrigin] = useState<LatLng | null>(null)
  const [destination, setDestination] = useState<LatLng | null>(null)
  const [destQuery, setDestQuery] = useState('')
  const [clickToSetDest, setClickToSetDest] = useState(false)
  const [summary, setSummary] = useState('')

  const originMarkerRef = useRef<any>(null)
  const destMarkerRef = useRef<any>(null)
  const routeGroupRef = useRef<any>(new H.map.Group())

  // הוסף את קבוצת המסלול למפה
  useEffect(() => {
    const map = mapRef.current
    if (map) map.addObject(routeGroupRef.current)
  }, [mapRef.current])

  // לבחור יעד ע"י קליק על המפה
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
    const map = mapRef.current; if (!map) return
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
    const map = mapRef.current; if (!map) return
    const objs:any[] = []
    if (originMarkerRef.current) objs.push(originMarkerRef.current)
    if (destMarkerRef.current) objs.push(destMarkerRef.current)
    if (routeGroupRef.current) objs.push(routeGroupRef.current)
    if (!objs.length) return
    const bounds = objs.reduce((acc:any, o:any)=> acc? acc.merge(o.getBoundingBox()) : o.getBoundingBox(), null)
    if (bounds) map.getViewModel().setLookAtData({ bounds, padding: 40 })
  }

  const onFindMe = () => {
    if (!('geolocation' in navigator)) { alert('Geolocation not available'); return }
    navigator.geolocation.getCurrentPosition(
      (pos)=> {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setOrigin(p); setMarker(p, true)
        const map = mapRef.current; if (map) map.setCenter(p), map.setZoom(15)
      },
      (err)=> alert('Failed to get location: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const resetAll = () => {
    const map = mapRef.current; if (!map) return
    setOrigin(null); setDestination(null); setDestQuery(''); setSummary('')
    routeGroupRef.current.removeAll()
    if (originMarkerRef.current) map.removeObject(originMarkerRef.current)
    if (destMarkerRef.current) map.removeObject(destMarkerRef.current)
    originMarkerRef.current = null; destMarkerRef.current = null
  }

  const drawRouteFlexible = (flex: string) => {
    const map = mapRef.current; if (!map || !flex) return
    const line = H.geo.LineString.fromFlexiblePolyline(flex)
    const poly = new H.map.Polyline(line, { style: { lineWidth: 5 } })
    routeGroupRef.current.removeAll()
    routeGroupRef.current.addObject(poly)
  }

  const computeRoute = async () => {
    if (!origin || !destination) { alert('חסר מוצא/יעד'); return }
    setSummary('מחשב מסלול…')
    const o = `${origin.lat},${origin.lng}`
    const d = `${destination.lat},${destination.lng}`
    const data = await apiRoute(o, d)
    const route = data.routes?.[0]
    const flex = route?.sections?.[0]?.polyline || route?.polyline
    if (!flex) { setSummary('לא התקבל polyline'); return }
    drawRouteFlexible(flex)
    const s = route.sections?.[0]?.summary || route.summary
    setSummary(`~ ${Math.round((s?.duration ?? 0)/60)} דק׳, ~ ${metersToKm(s?.length ?? 0)} ק״מ`)
    fitToObjects()
  }

  useEffect(() => { if (origin) setMarker(origin, true); if (destination) setMarker(destination, false) }, [origin, destination])

  return (
    <div style={{height:'100%'}}>
      <div id="map"></div>
      <div className="panel">
        <TopBar onFindMe={onFindMe} onReset={resetAll} />

        <DestinationField
          originLat={origin?.lat}
          originLng={origin?.lng}
          value={destQuery}
          onChange={setDestQuery}
          onPickDestination={(lat,lng,label)=>{ setDestination({lat,lng}); setDestQuery(label); }}
        />

        <div className="dest-actions">
          <button className="btn" onClick={()=> setClickToSetDest(v=>!v)}>
            {clickToSetDest ? 'בטל בחירה במפה' : 'בחר יעד על המפה'}
          </button>
          <button className="btn" onClick={computeRoute}>חשב מסלול</button>
        </div>

        <div className="summary">{summary}</div>
        <div className="footer">Tip: בחר יעד מאוטוקומפליט או מקליק על המפה.</div>
      </div>
    </div>
  )
}
