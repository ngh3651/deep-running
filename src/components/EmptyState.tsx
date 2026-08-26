export default function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="card empty">
      <div className="empty-emoji">{emoji}</div>
      <p className="sub">{text}</p>
    </div>
  )
}
