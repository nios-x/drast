# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers running DrastDB on their own machine (localhost) who want to try queries quickly: create tables, insert and inspect rows, and poke at the key/value store without writing curl commands. Usually the person who is building or learning DrastDB itself.

## Product Purpose

The DrastDB Playground is a browser UI for a running DrastDB server. It lets a developer write and run DrastDB queries, see results as real tables, browse what's stored, and recover earlier queries. Success means you never need curl or PowerShell to explore the database.

## Positioning

A playground for DrastDB's own small SQL-like dialect, not a generic SQL client. It knows the dialect's real rules (one query per request, no semicolons, one `WHERE col = value`, everything is text, an in-memory key/value store next to file-backed tables) and helps the user stay inside them.

## Operating Context

- DrastDB runs locally (`cargo run` or Docker) on `http://127.0.0.1:3495`. The playground runs with Vite (`npm run dev`) beside it.
- The API is a single `POST /query` with `{"query": "..."}`. Success returns `{"response": "<text>"}`; failure returns `400` with a plain-text message. `SELECT` returns tab-separated text with a `(N row(s))` footer.
- Typical session: load sample data, run SELECTs, tweak with UPDATE/DELETE, check results, repeat.

## Capabilities and Constraints

- Panels confirmed by the user: query editor + results, tables sidebar, query history, key/value panel, sample data + example snippets.
- Backend additions approved by the user: a `SHOW TABLES` command (lists table names) and CORS headers so the frontend can call the API from another origin.
- Values are strings; no types, ordering, joins or multi-condition WHERE. The UI must not imply features the database lacks.
- The key/value store is in memory and is cleared on server restart; tables persist in `dbfiles/`.
- No authentication exists. The playground is meant for localhost use.

## Brand Commitments

- Name: **DrastDB** (the playground is "DrastDB Playground").
- The user pinned the look: a **black, Vercel-style theme**.

## Evidence on Hand

- Real API behaviour and error messages are documented in `../docs/query-language.md` and `../docs/http-api.md`.
- No logos, screenshots, testimonials or usage numbers exist. Do not invent any.

## Product Principles

1. The query is the hero: typing and running a query must be instant and keyboard-first.
2. Show the database's truth: real responses, real error text, real row counts, never decorated or guessed.
3. Teach the dialect by example: snippets and errors guide the user toward valid DrastDB syntax.
4. Nothing is lost: history keeps every query so experiments are cheap.
