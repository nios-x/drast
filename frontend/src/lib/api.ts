export type QueryResult = {
  ok: boolean
  /** HTTP status, or 0 when the server could not be reached. */
  status: number
  /** The `response` text on success, the plain-text error otherwise. */
  text: string
  ms: number
}

export type TableData = { columns: string[]; rows: string[][] }

export type TableInfo = { name: string; columns: string[]; rows: number }

/**
 * `VITE_DRAST_URL` if set. Otherwise the dev server talks to a local DrastDB,
 * and a build talks to the server it was loaded from (DrastDB serves the build
 * at /playground/).
 */
export const DEFAULT_URL: string =
  (import.meta.env.VITE_DRAST_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://127.0.0.1:3495' : window.location.origin)

export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export async function runQuery(baseUrl: string, query: string): Promise<QueryResult> {
  const started = performance.now()
  try {
    const res = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const ms = performance.now() - started
    if (res.ok) {
      const data = (await res.json()) as { response?: unknown }
      return { ok: true, status: res.status, text: String(data.response ?? ''), ms }
    }
    const text = (await res.text()).trim()
    return { ok: false, status: res.status, text: text || `HTTP ${res.status}`, ms }
  } catch {
    return {
      ok: false,
      status: 0,
      text: `Can't reach DrastDB at ${baseUrl}.`,
      ms: performance.now() - started,
    }
  }
}

export async function ping(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

const FOOTER = /^\((\d+) row\(s\)\)$/

/** Parses the tab-separated text that SELECT and SHOW TABLES return. */
export function parseTable(text: string): TableData | null {
  const lines = text.split('\n')
  if (lines.length < 2 || !FOOTER.test(lines[lines.length - 1])) return null
  const columns = lines[0].split('\t')
  const rows = lines.slice(1, -1).map((line) => {
    const values = line.split('\t')
    return columns.map((_, i) => values[i] ?? '')
  })
  return { columns, rows }
}

export function parseShowTables(text: string): TableInfo[] | null {
  const table = parseTable(text)
  if (!table) return null
  return table.rows.map(([name, columns, rows]) => ({
    name,
    columns: columns ? columns.split(', ') : [],
    rows: Number(rows) || 0,
  }))
}
