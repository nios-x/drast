import type { ReactNode } from 'react'

const KEYWORDS = new Set([
  'CREATE', 'TABLE', 'TABLES', 'DROP', 'INSERT', 'INTO', 'VALUES', 'SELECT',
  'FROM', 'WHERE', 'UPDATE', 'SET', 'DELETE', 'GET', 'SHOW',
])

type Kind = 'kw' | 'str' | 'num' | 'punct' | 'comment' | 'plain'

function tokens(line: string): [Kind, string][] {
  if (line.trimStart().startsWith('--')) return [['comment', line]]
  const out: [Kind, string][] = []
  let i = 0
  while (i < line.length) {
    const c = line[i]
    if (c === "'" || c === '"') {
      const close = line.indexOf(c, i + 1)
      const end = close === -1 ? line.length : close + 1
      out.push(['str', line.slice(i, end)])
      i = end
    } else if ('(),=*;'.includes(c)) {
      out.push(['punct', c])
      i++
    } else if (/\s/.test(c)) {
      let j = i
      while (j < line.length && /\s/.test(line[j])) j++
      out.push(['plain', line.slice(i, j)])
      i = j
    } else {
      let j = i
      while (j < line.length && !/[\s(),=*;'"]/.test(line[j])) j++
      const word = line.slice(i, j)
      const kind: Kind = KEYWORDS.has(word.toUpperCase())
        ? 'kw'
        : /^-?\d+(\.\d+)?$/.test(word)
          ? 'num'
          : 'plain'
      out.push([kind, word])
      i = j
    }
  }
  return out
}

export function highlightLine(line: string): ReactNode {
  return tokens(line).map(([kind, text], i) =>
    kind === 'plain' ? text : (
      <span key={i} className={`tok-${kind}`}>
        {text}
      </span>
    ),
  )
}
