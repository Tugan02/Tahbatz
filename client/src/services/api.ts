export async function apiRoute(origin: string, destination: string) {
  const url = new URL('/api/route', window.location.origin)
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  const r = await fetch(url.toString())
  if (!r.ok) throw new Error('route failed')
  return r.json()
}

export async function apiAutosuggest(q: string, at: string, limit = 8, lang = 'he') {
  const url = new URL('/api/autosuggest', window.location.origin)
  url.searchParams.set('q', q)
  url.searchParams.set('at', at)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('lang', lang)
  const r = await fetch(url.toString())
  if (!r.ok) throw new Error('autosuggest failed')
  return r.json()
}

export async function apiGeocode(q: string, lang = 'he') {
  const url = new URL('/api/geocode', window.location.origin)
  url.searchParams.set('q', q)
  url.searchParams.set('lang', lang)
  const r = await fetch(url.toString())
  if (!r.ok) throw new Error('geocode failed')
  return r.json()
}
