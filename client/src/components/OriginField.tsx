import { useRef, useState } from 'react'
import SuggestionsList from './SuggestionsList'
import { apiAutosuggest, apiGeocode } from '../services/api'

type Props = {
  value: string
  onChange: (v: string) => void
  onPickOrigin: (lat: number, lng: number, label: string) => void
}

export default function OriginField({ value, onChange, onPickOrigin }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)

  // Wrapper for autosuggest logic
  const handleChange = (q: string) => {
    onChange(q)
    setSuggestions([])
    // lat,lon → no suggestions; can be converted directly later
    if (/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(q)) return
    if (q.trim().length < 3) { abortRef.current?.abort(); return }

    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(async () => {
      try {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        setLoading(true)
        // Using a default location (Tel Aviv) for context
        const at = `32.0853,34.7818`
        const data = await apiAutosuggest(q, at)
        setSuggestions(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if ((e as any).name !== 'AbortError') console.error(e)
      } finally {
        setLoading(false)
      }
    }, 250)
  }

  const onPick = (label: string, lat?: number, lng?: number) => {
    if (lat != null && lng != null) {
      onPickOrigin(lat, lng, label)
    } else {
      // Fallback – geocode completion
      apiGeocode(label).then(d => {
        const p = d.items?.[0]?.position
        if (p) onPickOrigin(p.lat, p.lng, label)
      })
    }
    setSuggestions([])
  }

  return (
    <div className="row field">
      <label>מוצא:</label>
      <div className="field-inputwrap">
        <input
          placeholder="כתובת או lat,lon"
          value={value}
          onChange={(e)=>handleChange(e.target.value)}
        />
        {(loading || suggestions.length > 0) && (
          <SuggestionsList
            loading={loading}
            items={suggestions}
            minQueryLenMet={value.trim().length >= 3}
            onPick={onPick}
          />
        )}
      </div>
    </div>
  )
}