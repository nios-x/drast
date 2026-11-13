import { useState, type FormEvent } from 'react'
import type { QueryResult } from '../lib/api'

type Op = { id: number; query: string; ok: boolean; text: string }

type Props = {
  online: boolean | null
  execute: (query: string) => Promise<QueryResult>
}

export function KvPanel({ online, execute }: Props) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [ops, setOps] = useState<Op[]>([])

  const send = async (verb: 'SET' | 'GET' | 'DELETE') => {
    const k = key.trim()
    if (!k) return setProblem('Enter a key first.')
    if (/\s/.test(k)) return setProblem('Keys cannot contain spaces.')
    if (verb === 'SET' && !value.trim()) return setProblem('Enter a value to set.')
    setProblem(null)
    setBusy(true)
    const query = verb === 'SET' ? `SET ${k} ${value.trim()}` : `${verb} ${k}`
    const result = await execute(query)
    setBusy(false)
    setOps((prev) => [{ id: Date.now(), query, ok: result.ok, text: result.text }, ...prev].slice(0, 20))
    if (verb === 'GET' && result.ok) setValue(result.text)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send('SET')
  }

  const disabled = busy || online === false

  return (
    <div className="side-panel">
      <div className="side-head">
        <p className="side-caption">In memory. Cleared when the server restarts.</p>
      </div>

      <form className="kv-form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field-label">Key</span>
          <input
            className="input mono"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="greeting"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span className="field-label">Value</span>
          <input
            className="input mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="hello world"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        {problem && (
          <p className="field-error" role="alert">
            {problem}
          </p>
        )}
        <div className="kv-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={disabled}>
            Set
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => void send('GET')}>
            Get
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-danger"
            disabled={disabled}
            onClick={() => void send('DELETE')}
          >
            Delete
          </button>
        </div>
      </form>

      {ops.length > 0 && (
        <ol className="kv-log" aria-label="Recent key/value operations">
          {ops.map((op) => (
            <li key={op.id} className={op.ok ? 'is-ok' : 'is-err'}>
              <code className="kv-log-query">{op.query}</code>
              <span className="kv-log-result">{op.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
