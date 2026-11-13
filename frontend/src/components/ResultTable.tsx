import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { TableData } from '../lib/api'

type Props = { data: TableData; onCopied: (rows: number) => void }

export function ResultTable({ data, onCopied }: Props) {
  const [copied, setCopied] = useState(false)
  const { columns, rows } = data

  const copy = async () => {
    const tsv = [columns, ...rows].map((r) => r.join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      onCopied(rows.length)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }

  return (
    <div className="result-table">
      <div className="result-table-scroll">
        <table>
          <thead>
            <tr>
              <th className="col-index" scope="col">
                <span className="visually-hidden">Row</span>
              </th>
              {columns.map((c, i) => (
                <th key={i} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="col-index" />
                <td className="cell-none" colSpan={columns.length}>
                  No rows matched.
                </td>
              </tr>
            ) : (
              rows.map((row, r) => (
                <tr key={r}>
                  <td className="col-index">{r + 1}</td>
                  {row.map((v, c) => (
                    <td key={c}>{v === '' ? <span className="cell-empty">empty</span> : v}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="result-table-foot">
        <span className="num">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'} · {columns.length}{' '}
          {columns.length === 1 ? 'column' : 'columns'}
        </span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={copy} disabled={rows.length === 0}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy TSV'}
        </button>
      </div>
    </div>
  )
}
