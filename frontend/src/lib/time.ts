export type HistoryItem = {
  id: number
  query: string
  ok: boolean
  ms: number
  at: number
  message: string
}

export function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
