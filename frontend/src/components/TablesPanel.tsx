import { ChevronRight, ListPlus, Play, RefreshCw, Table2, Trash } from 'lucide-react'
import { useState } from 'react'
import type { TableInfo } from '../lib/api'

type Props = {
  tables: TableInfo[] | null
  error: string | null
  loading: boolean
  online: boolean | null
  onRefresh: () => void
  onBrowse: (table: string) => void
  onInsertLine: (code: string) => void
  onLoadSample: () => void
}

export function TablesPanel({ tables, error, loading, online, onRefresh, onBrowse, onInsertLine, onLoadSample }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="side-panel">
      <div className="side-head">
        <p className="side-caption">
          {tables ? `${tables.length} ${tables.length === 1 ? 'table' : 'tables'} in dbfiles/` : 'Tables on disk'}
        </p>
        <button
          type="button"
          className="btn btn-icon"
          onClick={onRefresh}
          disabled={loading || online === false}
          aria-label="Refresh tables"
          title="Refresh tables"
        >
          <RefreshCw size={14} className={loading ? 'spin' : undefined} />
        </button>
      </div>

      {error ? (
        <div className="side-note is-err">
          <p>{error}</p>
          {error.startsWith('Not a Valid Input') || error.startsWith('Usage') ? (
            <p className="side-note-hint">This server doesn't know SHOW TABLES yet. Restart it with the latest code.</p>
          ) : null}
        </div>
      ) : tables === null && online === false ? (
        <div className="side-note">
          <p>Waiting for DrastDB. Tables appear here once the server is reachable.</p>
        </div>
      ) : tables === null ? (
        <div className="table-skeletons" aria-hidden="true">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : tables.length === 0 ? (
        <div className="side-empty">
          <p className="side-empty-title">No tables yet</p>
          <p>Create one with CREATE TABLE in the editor, or start from demo data.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onLoadSample} disabled={!online}>
            Load sample data
          </button>
        </div>
      ) : (
        <ul className="table-list">
          {tables.map((t) => {
            const expanded = open === t.name
            return (
              <li key={t.name} className={`table-item${expanded ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="table-row"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : t.name)}
                >
                  <ChevronRight size={14} className="table-chevron" />
                  <Table2 size={14} className="table-icon" />
                  <span className="table-name">{t.name}</span>
                  <span className="table-count num">
                    {t.rows} {t.rows === 1 ? 'row' : 'rows'}
                  </span>
                </button>
                {expanded && (
                  <div className="table-detail">
                    <ul className="column-list" aria-label={`Columns of ${t.name}`}>
                      {t.columns.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                    <div className="table-actions">
                      <button type="button" className="btn btn-secondary btn-xs" onClick={() => onBrowse(t.name)}>
                        <Play size={12} />
                        Browse
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        title="Add an INSERT for this table to the editor"
                        onClick={() =>
                          onInsertLine(`INSERT INTO ${t.name} VALUES (${t.columns.map(() => "''").join(', ')})`)
                        }
                      >
                        <ListPlus size={12} />
                        Insert row
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-danger"
                        title="Add DROP TABLE to the editor. Nothing runs until you run it."
                        onClick={() => onInsertLine(`DROP TABLE ${t.name}`)}
                      >
                        <Trash size={12} />
                        Drop
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
