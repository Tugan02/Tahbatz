import { useEffect, useRef } from 'react'
declare const H: any

const JS_API_KEY = import.meta.env.VITE_HERE_API_KEY

export function useHereMap(containerId: string, center = { lat: 32.0853, lng: 34.7818 }, zoom = 13) {
  const mapRef = useRef<any>(null)
  const platformRef = useRef<any>(null)
  const uiRef = useRef<any>(null)
  const behaviorRef = useRef<any>(null)

  useEffect(() => {
    if (!JS_API_KEY) {
      console.error('Missing VITE_HERE_JS_API_KEY')
      return
    }
    const platform = new H.service.Platform({ apikey: JS_API_KEY }) 
    const defaultLayers = platform.createDefaultLayers()
    const container = document.getElementById(containerId)!
    const map = new H.Map(container, defaultLayers.vector.normal.map, {
      center, zoom, pixelRatio: window.devicePixelRatio || 1
    })
    window.addEventListener('resize', () => map.getViewPort().resize())
    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map))
    const ui = H.ui.UI.createDefault(map, defaultLayers)

    platformRef.current = platform
    mapRef.current = map
    uiRef.current = ui
    behaviorRef.current = behavior
    return () => map.dispose()  
  }, [containerId])

  return { mapRef, platformRef, uiRef, behaviorRef }
}
