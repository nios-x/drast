/**
 * DrastDB takes one query per request, so the playground treats every
 * non-empty line of the editor as one statement.
 */
export type Statement = {
  /** 0-based line index in the editor. */
  line: number
  /** The query actually sent: trimmed, trailing semicolons removed. */
  query: string
  /** The line exactly as written, used to tell whether it changed since it ran. */
  source: string
}

export function cleanLine(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.startsWith('--')) return null
  const query = trimmed.replace(/[;\s]+$/, '')
  return query || null
}

function toStatements(lines: string[], from: number, to: number): Statement[] {
  const out: Statement[] = []
  for (let i = from; i <= to && i < lines.length; i++) {
    const query = cleanLine(lines[i])
    if (query) out.push({ line: i, query, source: lines[i] })
  }
  return out
}

export function allStatements(source: string): Statement[] {
  const lines = source.split('\n')
  return toStatements(lines, 0, lines.length - 1)
}

export function lineAt(source: string, offset: number): number {
  let line = 0
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') line++
  }
  return line
}

/**
 * The statements "Run" would execute for a selection: every statement line the
 * selection touches, or the statement under the caret. When the caret sits on a
 * blank or comment line, the nearest statement above it is used.
 */
export function selectedStatements(source: string, start: number, end: number): Statement[] {
  const lines = source.split('\n')
  const first = lineAt(source, start)
  const last = lineAt(source, Math.max(start, end - (end > start && source[end - 1] === '\n' ? 1 : 0)))
  if (start !== end) return toStatements(lines, first, last)

  for (let i = first; i >= 0; i--) {
    const query = cleanLine(lines[i])
    if (query) return [{ line: i, query, source: lines[i] }]
  }
  return []
}

export function commandOf(query: string): string {
  const [first = '', second = ''] = query.trim().split(/\s+/)
  const cmd = first.toUpperCase()
  if (cmd === 'DELETE' && second.toUpperCase() === 'FROM') return 'DELETE FROM'
  if (cmd === 'SHOW') return 'SHOW TABLES'
  return cmd
}

const TABLE_RESULTS = new Set(['SELECT', 'SHOW TABLES'])
const CHANGES_TABLES = new Set(['CREATE', 'DROP', 'INSERT', 'UPDATE', 'DELETE FROM'])

export const returnsTable = (query: string) => TABLE_RESULTS.has(commandOf(query))
export const changesTables = (query: string) => CHANGES_TABLES.has(commandOf(query))
