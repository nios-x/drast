/** A short recovery tip for common DrastDB errors, or null when the message says enough. */
export function hintFor(message: string, status: number): string | null {
  if (status === 0) {
    return 'Start the server with cargo run. If it is already running, restart it so it has CORS support.'
  }
  if (message.startsWith("Unexpected '")) return "Values with spaces need quotes, like 'Rahul Kumar'."
  if (message.includes('does not exist')) return 'Create it with CREATE TABLE, or pick one from the Tables list.'
  if (message.startsWith('Unknown column')) {
    return 'Column names are case-sensitive. Expand the table in the sidebar to see them.'
  }
  if (/^Expected \d+ values/.test(message)) {
    return 'Give one value per column, or name the columns: INSERT INTO t (a, b) VALUES (1, 2)'
  }
  if (message.startsWith('Invalid table name')) return 'Names may only use letters, digits and underscores.'
  if (message === 'Unclosed quote.') return "Close every value you open with ' or \"."
  return null
}
