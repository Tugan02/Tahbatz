type Props = {
  onFindMe: () => void
  onReset: () => void
}
export default function TopBar({ onFindMe, onReset }: Props) {
  return (
    <div className="row buttons">
      <button className="btn primary" onClick={onFindMe}>📍 מצא אותי</button>
      <button className="btn secondary" onClick={onReset}>איפוס</button>
    </div>
  )
}
