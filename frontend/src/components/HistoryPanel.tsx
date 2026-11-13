import { Play, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { highlightLine } from '../lib/highlight'
import { timeAgo, type HistoryItem } from '../lib/time'

type Props = {
  items: HistoryItem[]
  onInsertLine: (code: string) => void
  onRunNow: (query: string) => void
  onClear: () => void
  busy: boolean
}

export function HistoryPanel({ items, onInsertLine, onRunNow, onClear, busy }: Props) {
  const [filter, setFilter] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  const needle = filter.trim().toLowerCase()
  const shown = needle ? items.filter((i) => i.query.toLowerCase().includes(needle)) : items

  return (
    <div className="side-panel">
      <div className="side-head">
        <label className="search">
          <Search size={14} aria-hidden="true" />
          <span className="visually-hidden">Filter history</span>
          <input
            className="search-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter queries"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          className={`btn btn-ghost btn-xs${confirming ? ' btn-danger' : ''}`}
          disabled={items.length === 0}
          onClick={() => {
            if (confirming) {
              onClear()
              setConfirming(false)
            } else setConfirming(true)
          }}
        >
          {confirming ? 'Clear all?' : 'Clear'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="side-empty">
          <p className="side-empty-title">No queries yet</p>
          <p>Everything you run is saved here, in this browser. Click one to put it back in the editor.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="side-empty">
          <p>No queries contain “{filter.trim()}”.</p>
        </div>
      ) : (
        <ol className="history-list">
          {shown.map((h) => (
            <li key={h.id} className="history-item">
              <button
                type="button"
                className="history-main"
                title={h.ok ? `${h.query}\n\nClick to add to the editor` : `${h.query}\n${h.message}\n\nClick to add to the editor`}
                onClick={() => onInsertLine(h.query)}
              >
                <span className={`status-dot ${h.ok ? 'is-ok' : 'is-err'}`} aria-label={h.ok ? 'Succeeded' : 'Failed'} />
                <code className="history-query">{highlightLine(h.query)}</code>
                <span className="history-meta num">
                  {Math.max(1, Math.round(h.ms))} ms · {timeAgo(h.at, now)}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-icon history-run"
                aria-label={`Run again: ${h.query}`}
                title="Run again"
                disabled={busy}
                onClick={() => onRunNow(h.query)}
              >
                <Play size={13} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
