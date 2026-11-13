# DrastDB Playground

A browser UI for [DrastDB](../README.md). Write queries, run them line by line, browse your tables, and use the key/value store without curl.

Built with React 19, TypeScript and Vite, in a black theme using the Geist fonts.

## Run it

1. Start DrastDB (from the repository root):

   ```bash
   cargo run
   ```

2. Start the playground (needs Node.js 20.19 or newer):

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open **http://localhost:5173**. The status pill in the top bar turns green when the playground can reach the server.

The playground needs a DrastDB build that has `SHOW TABLES` and CORS support. If the pill stays on **Offline** while the server is running, the server is an older build: rebuild it (or the Docker image) from the latest code and restart it.

## Using it

| Do this | How |
|---|---|
| Run the query under the cursor | `Ctrl+Enter` (`⌘+Enter` on macOS), or the **Run** button |
| Run every line in the editor | `Ctrl+Shift+Enter`, or **Run all**. Stops at the first error. |
| Run only some lines | Select them, then `Ctrl+Enter` |
| Insert an example query | **Examples** menu |
| Try it with demo data | **Load sample data** (creates `customers` and `products` with made-up rows, only if they don't exist yet) |
| Browse a table | **Tables** tab → click the table → **Browse** |
| Use the key/value store | **Key/value** tab |
| Re-use an earlier query | **History** tab: click to add it to the editor, ▶ to run it again |
| Point at another server | Click the status pill and change the URL |
| Resize editor vs. output | Drag the handle between them (or focus it and use the arrow keys) |

Notes on the editor:

- **Every non-empty line is one query**, because DrastDB takes one query per request. Lines starting with `--` are comments.
- A trailing `;` is removed before the query is sent, since DrastDB rejects it.
- After a run, each executed line gets a green or red dot in the gutter. Hover a dot to see the result.
- The editor text, history (last 200 queries), selected tab and editor height are saved in your browser's `localStorage`.

## Configuration

| Setting | Default | How to change |
|---|---|---|
| Server URL | `http://127.0.0.1:3495` | Click the status pill in the app, or set `VITE_DRAST_URL` before `npm run dev` / `npm run build` |

```bash
VITE_DRAST_URL=http://127.0.0.1:8080 npm run dev
```

## Hosting it elsewhere

`npm run build` writes a static site to `dist/`, which you can host anywhere (Vercel, Netlify, any static server). The server then has to allow that site's address:

```bash
DRAST_CORS_ORIGINS=https://my-playground.vercel.app cargo run
```

DrastDB has no authentication, so only point a hosted playground at a server you're comfortable exposing.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 5173 |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | Lint with oxlint |

## Code map

```
src/
├── App.tsx               state, running queries, layout
├── App.css / index.css   theme tokens and component styles
├── components/
│   ├── Header.tsx        logo, connection pill + server URL popover
│   ├── Editor.tsx        textarea over a highlighted layer, gutter with status dots
│   ├── ExamplesMenu.tsx  insertable example queries
│   ├── Output.tsx        run log, errors with hints, empty state
│   ├── ResultTable.tsx   SELECT / SHOW TABLES results, Copy TSV
│   ├── TablesPanel.tsx   tables, columns, browse / insert / drop helpers
│   ├── KvPanel.tsx       SET / GET / DELETE form
│   └── HistoryPanel.tsx  searchable query history
└── lib/
    ├── api.ts            fetch wrapper, response parsing
    ├── statements.ts     splitting the editor into one query per line
    ├── highlight.tsx     syntax highlighting
    ├── snippets.ts       examples, sample data, welcome text
    └── hints.ts          recovery tips for common errors
```

The design system is recorded in [DESIGN.md](DESIGN.md) and the product brief in [PRODUCT.md](PRODUCT.md).
