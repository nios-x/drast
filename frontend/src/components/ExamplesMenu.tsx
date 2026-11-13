import { BookOpen, ChevronDown } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { highlightLine } from '../lib/highlight'
import { SNIPPETS } from '../lib/snippets'
import { useDismiss } from '../lib/useDismiss'

export function ExamplesMenu({ onPick }: { onPick: (code: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-expanded={open}
        aria-controls="examples-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <BookOpen size={14} />
        Examples
        <ChevronDown size={14} className="btn-chevron" />
      </button>
      {open && (
        <div id="examples-menu" className="menu menu-right examples-menu" role="region" aria-label="Example queries">
          {SNIPPETS.map((group) => (
            <div key={group.title} className="menu-group" role="group" aria-label={group.title}>
              <p className="menu-group-title">{group.title}</p>
              {group.items.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  title="Add to the editor"
                  className="menu-item"
                  onClick={() => {
                    onPick(s.code)
                    setOpen(false)
                  }}
                >
                  <span className="menu-item-label">{s.label}</span>
                  <code className="menu-item-code">{highlightLine(s.code)}</code>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
