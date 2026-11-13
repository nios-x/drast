import { useMemo, useRef, useState, type RefObject } from 'react'
import { highlightLine } from '../lib/highlight'
import { selectedStatements } from '../lib/statements'

export type LineMark = { ok: boolean; source: string; message: string }

type Props = {
  value: string
  onChange: (value: string) => void
  marks: Record<number, LineMark>
  runningLine: number | null
  onRun: (start: number, end: number) => void
  onRunAll: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function Editor({ value, onChange, marks, runningLine, onRun, onRunAll, textareaRef }: Props) {
  const gutterRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState({ start: 0, end: 0 })

  const lines = value.split('\n')
  const active = useMemo(
    () => new Set(selectedStatements(value, sel.start, sel.end).map((s) => s.line)),
    [value, sel],
  )

  const syncSelection = () => {
    const ta = textareaRef.current
    if (ta) setSel({ start: ta.selectionStart, end: ta.selectionEnd })
  }

  const syncScroll = () => {
    const ta = textareaRef.current
    if (!ta) return
    if (layerRef.current) {
      layerRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`
    }
    if (gutterRef.current) {
      gutterRef.current.style.transform = `translateY(${-ta.scrollTop}px)`
    }
  }

  return (
    <div className="editor">
      <div className="editor-gutter" aria-hidden="true">
        <div ref={gutterRef} className="editor-gutter-inner">
          {lines.map((line, i) => {
            const mark = marks[i]
            const fresh = mark && mark.source === line
            const state = runningLine === i ? 'is-running' : fresh ? (mark.ok ? 'is-ok' : 'is-err') : ''
            return (
              <div
                key={i}
                className={`gutter-line${active.has(i) ? ' is-active' : ''}`}
                title={fresh ? mark.message : undefined}
              >
                <span className={`gutter-dot ${state}`} />
                <span className="gutter-num">{i + 1}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="editor-code">
        <div ref={layerRef} className="editor-layer" aria-hidden="true">
          {lines.map((line, i) => (
            <div key={i} className={`code-line${active.has(i) ? ' is-active' : ''}`}>
              {highlightLine(line)}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="editor-input"
          value={value}
          aria-label="Query editor. One query per line."
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          onChange={(e) => {
            onChange(e.target.value)
            setSel({ start: e.target.selectionStart, end: e.target.selectionEnd })
          }}
          onSelect={syncSelection}
          onScroll={syncScroll}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              const ta = e.currentTarget
              if (e.shiftKey) onRunAll()
              else onRun(ta.selectionStart, ta.selectionEnd)
            }
          }}
        />
      </div>
    </div>
  )
}
