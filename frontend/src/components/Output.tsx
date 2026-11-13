import { CircleCheck, CircleX, Database, Eraser, LoaderCircle, Unplug } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { parseTable, type QueryResult } from '../lib/api'
import { highlightLine } from '../lib/highlight'
import { hintFor } from '../lib/hints'
import { returnsTable } from '../lib/statements'
import { ResultTable } from './ResultTable'

export type RunEntry = {
  id: number
  line: number | null
  query: string
  result?: QueryResult
}

export type RunState = {
  entries: RunEntry[]
  /** Statements not sent because an earlier one failed. */
  skipped: number
}

type Props = {
  run: RunState | null
  online: boolean | null
  baseUrl: string
  modKey: string
  onClear: () => void
  onLoadSample: () => void
  onCopied: (rows: number) => void
}

function Entry({ entry, onCopied }: { entry: RunEntry; onCopied: (rows: number) => void }) {
  const { result } = entry
  const table = result?.ok && returnsTable(entry.query) ? parseTable(result.text) : null
  const hint = result && !result.ok ? hintFor(result.text, result.status) : null
  const inline = result?.ok && !table ? result.text : null

  return (
    <article className={`entry ${!result ? 'is-pending' : result.ok ? 'is-ok' : 'is-err'}`}>
      <header className="entry-head">
        <span className="entry-icon" aria-hidden="true">
          {!result ? (
            <LoaderCircle size={15} className="spin" />
          ) : result.ok ? (
            <CircleCheck size={15} />
          ) : (
            <CircleX size={15} />
          )}
        </span>
        <code className="entry-query">{highlightLine(entry.query)}</code>
        {inline !== null && <span className="entry-inline">{inline}</span>}
        <span className="entry-meta num">
          {entry.line !== null && <span>Ln {entry.line + 1}</span>}
          {result && result.status > 0 && <span>{result.status}</span>}
          {result && <span>{Math.max(1, Math.round(result.ms))} ms</span>}
        </span>
      </header>

      {!result ? (
        <div className="entry-body">
          <div className="skeleton" />
        </div>
      ) : table ? (
        <div className="entry-body">
          <ResultTable data={table} onCopied={onCopied} />
        </div>
      ) : !result.ok ? (
        <div className="entry-body">
          <p className="entry-error">{result.text}</p>
          {hint && <p className="entry-hint">{hint}</p>}
        </div>
      ) : null}
    </article>
  )
}

function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>
}

export function Output({ run, online, baseUrl, modKey, onClear, onLoadSample, onCopied }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const done = run?.entries.filter((e) => e.result) ?? []
  const failed = done.filter((e) => !e.result?.ok).length
  const totalMs = done.reduce((sum, e) => sum + (e.result?.ms ?? 0), 0)
  const pending = run ? run.entries.length - done.length : 0
  const complete = run !== null && pending === 0
  const lastId = run?.entries.at(-1)?.id
  const count = run?.entries.length ?? 0

  // After a multi-line run, bring its final result (or the error) into view.
  useEffect(() => {
    const box = scrollRef.current
    if (!complete || count < 2 || !box) return
    const last = box.querySelector<HTMLElement>('.entry:last-of-type')
    if (last) box.scrollTo({ top: Math.max(0, last.offsetTop - 8), behavior: 'smooth' })
  }, [complete, lastId, count])

  return (
    <section className="panel output" aria-label="Output">
      <div className="panel-bar">
        <h2 className="panel-title">Output</h2>
        {run && (
          <p className="output-summary num" aria-live="polite">
            {pending > 0
              ? `Running ${done.length + 1} of ${run.entries.length}…`
              : `${done.length} ${done.length === 1 ? 'query' : 'queries'} · ${failed ? `${failed} failed` : 'all ok'} · ${Math.max(1, Math.round(totalMs))} ms`}
          </p>
        )}
        <div className="panel-actions">
          {run && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={onClear} disabled={pending > 0}>
              <Eraser size={13} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="output-scroll" ref={scrollRef}>
        {run ? (
          <div className="entries">
            {run.entries.map((e) => (
              <Entry key={e.id} entry={e} onCopied={onCopied} />
            ))}
            {run.skipped > 0 && pending === 0 && (
              <p className="entries-note">
                Stopped after the error. {run.skipped} later {run.skipped === 1 ? 'line was' : 'lines were'} not run.
              </p>
            )}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-frame">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              {online === false ? (
                <>
                  <Unplug size={20} className="empty-icon" />
                  <h3>DrastDB isn't reachable</h3>
                  <p>
                    Nothing is answering at <code>{baseUrl}</code>. Start it with <code>cargo run</code> in the
                    project folder. This page reconnects on its own.
                  </p>
                </>
              ) : (
                <>
                  <Database size={20} className="empty-icon" />
                  <h3>Run your first query</h3>
                  <p>
                    Each line in the editor is one query. Put the cursor on a line and press{' '}
                    <Kbd>{modKey}</Kbd> <Kbd>Enter</Kbd>, or <Kbd>{modKey}</Kbd> <Kbd>Shift</Kbd> <Kbd>Enter</Kbd>{' '}
                    to run every line.
                  </p>
                  <button type="button" className="btn btn-secondary" onClick={onLoadSample} disabled={!online}>
                    Load sample data
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
