type Item = { address?: { label?: string }; title?: string; position?: { lat:number; lng:number } }
type Props = {
  loading: boolean
  items: Item[]
  minQueryLenMet: boolean
  onPick: (label: string, lat?: number, lng?: number) => void
}
export default function SuggestionsList({ loading, items, minQueryLenMet, onPick }: Props) {
  return (
    <div className="suggestions">
      {loading && items.length === 0 && <div className="suggestion loading">מחפש…</div>}
      {items.map((s, i) => {
        const label = s.address?.label || s.title || ''
        const pos = s.position
        return (
          <div key={i} className="suggestion"
               onMouseDown={(e)=>e.preventDefault()}
               onClick={() => onPick(label, pos?.lat, pos?.lng)}>
            <span className={`icon ${pos ? 'pin' : 'history'}`} />
            <div className="text">{label}</div>
          </div>
        )
      })}
      {!loading && items.length === 0 && minQueryLenMet && (
        <div className="suggestion empty">אין הצעות</div>
      )}
    </div>
  )
}
