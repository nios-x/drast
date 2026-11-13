export type Snippet = { label: string; code: string }
export type SnippetGroup = { title: string; items: Snippet[] }

export const SNIPPETS: SnippetGroup[] = [
  {
    title: 'Tables',
    items: [
      { label: 'Show all tables', code: 'SHOW TABLES' },
      { label: 'Create a table', code: 'CREATE TABLE users (id, name, age)' },
      { label: 'Insert a row', code: "INSERT INTO users VALUES (1, 'Soumya Jaiswal', 20)" },
      { label: 'Insert some columns', code: "INSERT INTO users (id, name) VALUES (2, 'Rahul')" },
      { label: 'Select everything', code: 'SELECT * FROM users' },
      { label: 'Select with a filter', code: 'SELECT name, age FROM users WHERE id = 1' },
      { label: 'Update rows', code: "UPDATE users SET name = 'Rahul Kumar', age = 21 WHERE id = 2" },
      { label: 'Delete rows', code: 'DELETE FROM users WHERE id = 2' },
      { label: 'Drop a table', code: 'DROP TABLE users' },
    ],
  },
  {
    title: 'Key/value',
    items: [
      { label: 'Set a key', code: 'SET greeting hello world' },
      { label: 'Get a key', code: 'GET greeting' },
      { label: 'Delete a key', code: 'DELETE greeting' },
    ],
  },
]

/** Synthetic demo data, created only for tables that don't exist yet. */
export const SAMPLE: { table: string; lines: string[] }[] = [
  {
    table: 'customers',
    lines: [
      'CREATE TABLE customers (id, name, city, plan)',
      "INSERT INTO customers VALUES (1, 'Aarav Mehta', Pune, pro)",
      "INSERT INTO customers VALUES (2, 'Diya Sharma', Delhi, free)",
      "INSERT INTO customers VALUES (3, 'Kabir Rao', Bengaluru, team)",
      "INSERT INTO customers VALUES (4, 'Meera Iyer', Chennai, free)",
      "INSERT INTO customers VALUES (5, 'Rohan Gupta', Mumbai, pro)",
    ],
  },
  {
    table: 'products',
    lines: [
      'CREATE TABLE products (sku, name, price, stock)',
      "INSERT INTO products VALUES (KB-100, 'Mechanical Keyboard', 4999, 12)",
      "INSERT INTO products VALUES (MS-210, 'Wireless Mouse', 1299, 40)",
      "INSERT INTO products VALUES (MN-270, '27-inch Monitor', 15999, 5)",
      "INSERT INTO products VALUES (HD-330, 'USB-C Hub', 2499, 0)",
    ],
  },
]

export const WELCOME = `-- DrastDB Playground. Every line is one query.
-- Put the cursor on a line and press Ctrl+Enter to run it,
-- or Ctrl+Shift+Enter to run the whole editor.
SHOW TABLES
`
