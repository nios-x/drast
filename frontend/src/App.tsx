import { LoaderCircle, Play } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Editor, type LineMark } from './components/Editor'
import { ExamplesMenu } from './components/ExamplesMenu'
import { Header } from './components/Header'
import { HistoryPanel } from './components/HistoryPanel'
import { KvPanel } from './components/KvPanel'
import { Output, type RunEntry, type RunState } from './components/Output'
import { TablesPanel } from './components/TablesPanel'
import {
  DEFAULT_URL,
  normalizeUrl,
  parseShowTables,
  parseTable,
  ping,
  runQuery,
  type QueryResult,
  type TableInfo,
} from './lib/api'
import { SAMPLE, WELCOME } from './lib/snippets'
import {
  allStatements,
  changesTables,
  commandOf,
  lineAt,
  returnsTable,
  selectedStatements,
  type Statement,
} from './lib/statements'
import { load, save } from './lib/storage'
import type { HistoryItem } from './lib/time'

const LINE_H = 22
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent)
const MOD = IS_MAC ? '⌘' : 'Ctrl'

type Tab = 'tables' | 'kv' | 'history'

/** A statement run from outside the editor (sidebar, history). */
const detached = (query: string): Statement => ({ line: -1, query, source: query })

function markMessage(query: string, r: QueryResult): string {
  if (r.ok && returnsTable(query)) {
    const n = parseTable(r.text)?.rows.length ?? 0
    return `${n} ${n === 1 ? 'row' : 'rows'}`
  }
  return r.text
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState(() => normalizeUrl(load('drast.url', DEFAULT_URL)))
  const [online, setOnline] = useState<boolean | null>(null)
  const [source, setSource] = useState(() => load('drast.source', WELCOME))
  const [marks, setMarks] = useState<Record<number, LineMark>>({})
  const [runningLine, setRunningLine] = useState<number | null>(null)
  const [run, setRun] = useState<RunState | null>(null)
  const [busy, setBusy] = useState(false)
  const [tables, setTables] = useState<TableInfo[] | null>(null)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [tablesLoading, setTablesLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>(() => load('drast.history', []))
  const [tab, setTab] = useState<Tab>(() => load('drast.tab', 'tables'))
  const [editorH, setEditorH] = useState(() => load('drast.editorH', 300))
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const busyRef = useRef(false)
  const seq = useRef(0)
  const pendingCaret = useRef<number | null>(null)
  /** Unique across reloads, so new history ids never collide with saved ones. */
  const nextId = useCallback(() => Date.now() * 1000 + (seq.current++ % 1000), [])

  useEffect(() => save('drast.url', baseUrl), [baseUrl])
  useEffect(() => save('drast.source', source), [source])
  useEffect(() => save('drast.history', history), [history])
  useEffect(() => save('drast.tab', tab), [tab])
  useEffect(() => save('drast.editorH', editorH), [editorH])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])
  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), [])

  const refreshTables = useCallback(async () => {
    setTablesLoading(true)
    const r = await runQuery(baseUrl, 'SHOW TABLES')
    setTablesLoading(false)
    if (r.ok) {
      setTables(parseShowTables(r.text) ?? [])
      setTablesError(null)
    } else if (r.status !== 0) {
      setTablesError(r.text)
    }
    return r
  }, [baseUrl])

  // Connection: check now, every 8 s, and whenever the window regains focus.
  // Each time the server comes (back) online, reload the table list.
  useEffect(() => {
    let alive = true
    let wasOnline = false
    const tick = async () => {
      const ok = await ping(baseUrl)
      if (!alive) return
      setOnline(ok)
      if (ok && !wasOnline) void refreshTables()
      wasOnline = ok
    }
    void tick()
    const timer = setInterval(tick, 8000)
    const onFocus = () => void tick()
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [baseUrl, refreshTables])

  const record = useCallback((query: string, r: QueryResult) => {
    const item: HistoryItem = {
      id: nextId(),
      query,
      ok: r.ok,
      ms: r.ms,
      at: Date.now(),
      message: r.text.slice(0, 300),
    }
    setHistory((prev) => [item, ...prev].slice(0, 200))
  }, [nextId])

  const afterQuery = useCallback(
    (query: string, r: QueryResult) => {
      setOnline(r.status !== 0)
      record(query, r)
      if (r.ok && commandOf(query) === 'SHOW TABLES') {
        setTables(parseShowTables(r.text) ?? [])
        setTablesError(null)
      }
    },
    [record],
  )

  const runStatements = useCallback(
    async (stmts: Statement[]) => {
      if (busyRef.current) return
      if (stmts.length === 0) {
        showToast('Nothing to run here. Put the cursor on a query line.')
        return
      }
      busyRef.current = true
      setBusy(true)

      const entries: RunEntry[] = stmts.map((s) => ({
        id: nextId(),
        line: s.line >= 0 ? s.line : null,
        query: s.query,
      }))
      setRun({ entries, skipped: 0 })

      let changed = false
      for (let i = 0; i < stmts.length; i++) {
        const s = stmts[i]
        if (s.line >= 0) setRunningLine(s.line)
        const r = await runQuery(baseUrl, s.query)
        afterQuery(s.query, r)
        if (s.line >= 0) {
          setMarks((m) => ({ ...m, [s.line]: { ok: r.ok, source: s.source, message: markMessage(s.query, r) } }))
        }
        setRun((prev) =>
          prev ? { ...prev, entries: prev.entries.map((e, j) => (j === i ? { ...e, result: r } : e)) } : prev,
        )
        if (r.ok && changesTables(s.query)) changed = true
        if (!r.ok) {
          const rest = stmts.length - i - 1
          setRun((prev) => (prev ? { entries: prev.entries.slice(0, i + 1), skipped: rest } : prev))
          break
        }
      }

      setRunningLine(null)
      busyRef.current = false
      setBusy(false)
      if (changed) void refreshTables()
    },
    [afterQuery, baseUrl, nextId, refreshTables, showToast],
  )

  const execute = useCallback(
    async (query: string) => {
      const r = await runQuery(baseUrl, query)
      afterQuery(query, r)
      if (r.ok && changesTables(query)) void refreshTables()
      return r
    },
    [afterQuery, baseUrl, refreshTables],
  )

  const runCurrent = () => {
    const ta = textareaRef.current
    void runStatements(selectedStatements(source, ta?.selectionStart ?? 0, ta?.selectionEnd ?? 0))
  }
  const runAll = () => void runStatements(allStatements(source))

  /** Puts `code` on the line after the caret (or on the caret's line if it is blank). */
  const insertLine = useCallback(
    (code: string) => {
      const ta = textareaRef.current
      const pos = ta ? ta.selectionEnd : source.length
      const lines = source.split('\n')
      let target = Math.min(lineAt(source, pos), lines.length - 1)
      if (lines[target].trim()) {
        lines.splice(target + 1, 0, code)
        target += 1
      } else {
        lines[target] = code
      }
      pendingCaret.current = lines.slice(0, target + 1).join('\n').length
      setSource(lines.join('\n'))
    },
    [source],
  )

  // Move the caret to inserted text and keep it in view.
  useLayoutEffect(() => {
    const caret = pendingCaret.current
    const ta = textareaRef.current
    if (caret === null || !ta) return
    pendingCaret.current = null
    ta.focus()
    ta.setSelectionRange(caret, caret)
    const top = lineAt(ta.value, caret) * LINE_H
    if (top < ta.scrollTop) ta.scrollTop = Math.max(0, top - 12)
    else if (top + LINE_H > ta.scrollTop + ta.clientHeight - 28) ta.scrollTop = top - ta.clientHeight + LINE_H + 40
  }, [source])

  const loadSample = useCallback(async () => {
    if (busyRef.current) return
    const r = await runQuery(baseUrl, 'SHOW TABLES')
    if (!r.ok) {
      afterQuery('SHOW TABLES', r)
      showToast(r.status === 0 ? 'DrastDB is not reachable.' : r.text)
      return
    }
    const existing = new Set((parseShowTables(r.text) ?? []).map((t) => t.name))
    const blocks = SAMPLE.filter((b) => !existing.has(b.table))
    if (blocks.length === 0) {
      showToast('The sample tables already exist.')
      void runStatements([detached(`SELECT * FROM ${SAMPLE[0].table}`)])
      return
    }

    const script = [
      '-- Sample data: made-up rows to experiment with.',
      ...blocks.flatMap((b) => b.lines),
      `SELECT * FROM ${blocks[0].table}`,
    ]
    const kept = source.replace(/\s+$/, '')
    const prefix = kept ? `${kept}\n\n` : ''
    const next = `${prefix}${script.join('\n')}\n`
    const startLine = prefix.split('\n').length - 1
    pendingCaret.current = next.length - 1
    setSource(next)
    setTab('tables')
    await runStatements(allStatements(next).filter((s) => s.line >= startLine))
  }, [afterQuery, baseUrl, runStatements, showToast, source])

  const changeUrl = (url: string) => {
    setOnline(null)
    setTables(null)
    setTablesError(null)
    setBaseUrl(url)
  }
  const reconnect = async () => {
    setOnline(null)
    setOnline(await ping(baseUrl))
  }

  // Editor / output split.
  const maxEditor = () => Math.max(160, window.innerHeight - 280)
  const onResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = editorH
    const move = (ev: PointerEvent) => setEditorH(Math.min(maxEditor(), Math.max(140, startH + ev.clientY - startY)))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.classList.remove('is-resizing')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    document.body.classList.add('is-resizing')
  }
  const onResizeKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowUp' ? -24 : e.key === 'ArrowDown' ? 24 : 0
    if (!step) return
    e.preventDefault()
    setEditorH((h) => Math.min(maxEditor(), Math.max(140, h + step)))
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'tables', label: 'Tables', count: tables?.length },
    { id: 'kv', label: 'Key/value' },
    { id: 'history', label: 'History', count: history.length || undefined },
  ]

  return (
    <div className="app">
      <Header baseUrl={baseUrl} online={online} onChangeUrl={changeUrl} onReconnect={() => void reconnect()} />

      <div className="workspace">
        <aside className="sidebar" aria-label="Database">
          <div className="tabs" role="tablist" aria-label="Sidebar">
            {tabs.map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                className="tab"
                onClick={() => setTab(id)}
              >
                {label}
                {count !== undefined && <span className="tab-count num">{count}</span>}
              </button>
            ))}
          </div>
          <div className="tabpanels">
            <div role="tabpanel" id="panel-tables" aria-labelledby="tab-tables" hidden={tab !== 'tables'}>
              <TablesPanel
                tables={tables}
                error={tablesError}
                loading={tablesLoading}
                online={online}
                onRefresh={() => void refreshTables()}
                onBrowse={(t) => void runStatements([detached(`SELECT * FROM ${t}`)])}
                onInsertLine={insertLine}
                onLoadSample={() => void loadSample()}
              />
            </div>
            <div role="tabpanel" id="panel-kv" aria-labelledby="tab-kv" hidden={tab !== 'kv'}>
              <KvPanel online={online} execute={execute} />
            </div>
            <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" hidden={tab !== 'history'}>
              <HistoryPanel
                items={history}
                busy={busy}
                onInsertLine={insertLine}
                onRunNow={(q) => void runStatements([detached(q)])}
                onClear={() => setHistory([])}
              />
            </div>
          </div>
        </aside>

        <main className="main" style={{ '--editor-h': `${editorH}px` } as CSSProperties}>
          <section className="panel editor-panel" aria-label="Query editor">
            <div className="panel-bar">
              <h2 className="panel-title">Query</h2>
              <p className="panel-sub">One query per line</p>
              <div className="panel-actions">
                <ExamplesMenu onPick={insertLine} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={runAll} disabled={busy}>
                  Run all
                  <span className="kbd-hint" aria-hidden="true">
                    {MOD} ⇧ ↵
                  </span>
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={runCurrent} disabled={busy}>
                  {busy ? <LoaderCircle size={14} className="spin" /> : <Play size={14} />}
                  Run
                  <span className="kbd-hint" aria-hidden="true">
                    {MOD} ↵
                  </span>
                </button>
              </div>
            </div>
            <Editor
              value={source}
              onChange={setSource}
              marks={marks}
              runningLine={runningLine}
              onRun={(start, end) => void runStatements(selectedStatements(source, start, end))}
              onRunAll={runAll}
              textareaRef={textareaRef}
            />
          </section>

          <div
            className="resizer"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize editor"
            aria-valuenow={editorH}
            aria-valuemin={140}
            tabIndex={0}
            onPointerDown={onResizeStart}
            onKeyDown={onResizeKey}
          />

          <Output
            run={run}
            online={online}
            baseUrl={baseUrl}
            modKey={MOD}
            onClear={() => setRun(null)}
            onLoadSample={() => void loadSample()}
            onCopied={(n) => showToast(`Copied ${n} ${n === 1 ? 'row' : 'rows'} as tab-separated text.`)}
          />
        </main>
      </div>

      {toast && (
        <div key={toast.id} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
