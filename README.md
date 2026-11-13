<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/drastdb-logo-white.svg">
    <img alt="DrastDB" src="assets/logo/drastdb-logo-black.svg" height="48">
  </picture>
</h1>

<p align="center">
  <strong>A lightweight, file-backed database server written in Rust.</strong><br>
  SQL-like queries over HTTP · Human-readable storage · Built-in web playground
</p>

<p align="center">
  <a href="https://www.rust-lang.org"><img alt="Rust 1.85+" src="https://img.shields.io/badge/rust-1.85%2B-orange?logo=rust"></a>
  <a href="https://hub.docker.com/r/soumya7708/drast"><img alt="Docker Hub" src="https://img.shields.io/badge/docker-soumya7708%2Fdrast-2496ED?logo=docker&logoColor=white"></a>
  <a href="https://github.com/tokio-rs/axum"><img alt="Built with axum" src="https://img.shields.io/badge/built%20with-axum%20%2B%20tokio-blue"></a>
</p>

---

## Overview

**DrastDB** is a compact database server implemented in Rust on top of [axum](https://github.com/tokio-rs/axum) and [tokio](https://tokio.rs). Clients submit SQL-like queries through a JSON HTTP API, and the server persists each table as a plain-text file on disk. DrastDB also provides an in-memory key/value store and a browser-based playground for interactive use.

DrastDB is designed for **learning, prototyping, and small-scale projects**. It is not intended for production workloads; see [Limitations](#limitations) before adopting it.

### At a glance

Start the server with a single command:

```bash
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles soumya7708/drast
```

Then open **http://127.0.0.1:3495/playground/**, or issue a query from the terminal:

```bash
curl -X POST http://127.0.0.1:3495/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT name, age FROM users WHERE id = 2"}'
```

```json
{"response":"name\tage\nRahul\t22\n(1 row(s))"}
```

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Web Playground](#web-playground)
- [Query Reference](#query-reference)
- [HTTP API](#http-api)
- [Configuration](#configuration)
- [Storage Format](#storage-format)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Limitations](#limitations)
- [Development](#development)

---

## Features

| Feature | Description |
|---|---|
| **SQL-like tables** | `CREATE TABLE`, `DROP TABLE`, `SHOW TABLES`, `INSERT`, `SELECT`, `UPDATE`, and `DELETE FROM`, with an optional `WHERE column = value` filter. |
| **Web playground** | A browser interface for writing queries, browsing tables, and reviewing history, served directly by the server at `/playground/`. |
| **Key/value store** | `SET`, `GET`, and `DELETE` operations backed by an in-memory store. Fast, but non-persistent. |
| **JSON HTTP API** | A single `POST /query` endpoint that accepts and returns JSON. |
| **Human-readable storage** | Each table is stored as a tab-separated UTF-8 text file in `./dbfiles/`. |
| **Descriptive errors** | Invalid queries return `400 Bad Request` with a clear message, e.g. `Unknown column 'email'.` |
| **Container-ready** | A prebuilt image on Docker Hub (`soumya7708/drast`) and a multi-stage `Dockerfile` producing a minimal image that runs as a non-root user. |

---

## Getting Started

DrastDB can be run in three ways. The prebuilt Docker image is the recommended option for most users.

### Option 1 — Prebuilt Docker image (recommended)

**Prerequisite:** [Docker](https://docs.docker.com/get-docker/). No cloning or compilation is required.

```bash
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles soumya7708/drast
```

This command is identical in bash, PowerShell, and Command Prompt.

| Argument | Purpose |
|---|---|
| `-d` | Runs the container in detached (background) mode. |
| `--name drast` | Assigns the container the name `drast` for easier management. |
| `-p 3495:3495` | Exposes the server at `http://127.0.0.1:3495`. To use a different host port, change the first value (e.g. `-p 8080:3495`). |
| `-v drast-data:/app/dbfiles` | Persists table data in the named volume `drast-data`, so data survives container stops, removals, and upgrades. |
| `soumya7708/drast` | The image to run. |

Verify that the server is running:

```bash
curl http://127.0.0.1:3495/
```

```
DrastDB is a Simple Mini DB made in Rust.
API Server is Running...
```

**Container management:**

```bash
docker logs drast     # View server output
docker stop drast     # Stop the server
docker start drast    # Restart the server (existing tables are retained)

# Upgrade to the latest image (data in the drast-data volume is preserved)
docker pull soumya7708/drast
docker rm -f drast
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles soumya7708/drast
```

### Option 2 — Build from source with Cargo

**Prerequisite:** Rust **1.85 or later** (required for the 2024 edition). Tested with Rust 1.96.

```bash
git clone https://github.com/nios-x/drast.git
cd drast
cargo run
```

Expected output:

```
DrastDB is running...
Playground: not built (frontend/dist has no index.html), see /playground/
```

The second line reports whether the [web playground](#web-playground) is available; refer to that section to build it. The server listens on **http://127.0.0.1:3495** by default.

### Option 3 — Build a custom Docker image

Use this option to run a modified version of DrastDB in Docker. The multi-stage build compiles both the server and the playground, so neither Rust nor Node.js needs to be installed locally.

```bash
git clone https://github.com/nios-x/drast.git
cd drast
docker build -t drast .
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles drast
```

See [docs/deployment.md](docs/deployment.md) for Docker Compose, backups, and troubleshooting.

---

## Usage

All queries are submitted to `POST /query` as a JSON object:

```json
{ "query": "<query>" }
```

### curl (Linux, macOS, Git Bash)

```bash
# Create a table
curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE users (id, name, age)"}'

# Insert rows (escape double quotes inside JSON as \")
curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO users VALUES (1, \"Soumya Jaiswal\", 20)"}'

curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO users VALUES (2, Rahul, 22)"}'

# Query the table
curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users"}'
```

### PowerShell (Windows)

```powershell
function drast($q) {
  (Invoke-RestMethod -Uri http://127.0.0.1:3495/query -Method Post `
    -ContentType 'application/json' -Body (@{ query = $q } | ConvertTo-Json)).response
}

drast "CREATE TABLE users (id, name, age)"
drast "INSERT INTO users VALUES (1, 'Soumya Jaiswal', 20)"
drast "SELECT * FROM users"
```

Output:

```
id      name            age
1       Soumya Jaiswal  20
(1 row(s))
```

---

## Web Playground

**DrastDB Playground** is a dark-themed browser interface for interacting with the database. Its source resides in [`frontend/`](frontend/), and the server hosts it at **`/playground/`** (e.g. http://127.0.0.1:3495/playground/). The playground communicates with the server that served it, so no configuration is required.

| Environment | Setup |
|---|---|
| **Docker image** | Included by default. Open `/playground/` after starting the container. |
| **`cargo run`** | Build the playground once using [Node.js](https://nodejs.org) 20.19 or later (see below), then start the server from the repository root. |
| **Playground development** | Run `npm run dev` in `frontend/` and open http://localhost:5173 for hot module reloading. |

Building the playground for use with `cargo run`:

```bash
cd frontend
npm install
npm run build
cd ..
cargo run
```

The server serves the compiled assets from `frontend/dist`. Set `DRAST_PLAYGROUND_DIR` to use a different directory.

**Editor shortcuts:** each line in the editor is treated as a single query.

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` (`⌘+Enter` on macOS) | Run the query on the current line |
| `Ctrl+Shift+Enter` | Run all lines |

The sidebar lists existing tables, provides a form for the key/value store, and maintains a history of executed queries. See [frontend/README.md](frontend/README.md) for further details.

---

## Query Reference

Keywords are case-insensitive (`select`, `SELECT`, and `Select` are equivalent). Queries **must not** end with a semicolon.

### Tables (persisted to disk)

| Operation | Example | Success response |
|---|---|---|
| Create a table | `CREATE TABLE users (id, name, age)` | `Table 'users' created.` |
| Drop a table | `DROP TABLE users` | `Table 'users' dropped.` |
| List tables | `SHOW TABLES` | Each table with its columns and row count |
| Insert a full row | `INSERT INTO users VALUES (1, 'Soumya', 20)` | `1 row inserted into 'users'.` |
| Insert specific columns | `INSERT INTO users (id, name) VALUES (3, 'Amit')` | `1 row inserted into 'users'.` |
| Select all columns | `SELECT * FROM users` | Header, rows, `(N row(s))` |
| Select specific columns | `SELECT name, age FROM users WHERE id = 2` | Header, rows, `(N row(s))` |
| Update rows | `UPDATE users SET name = 'Rahul Kumar', age = 21 WHERE id = 2` | `1 row(s) updated in 'users'.` |
| Delete rows | `DELETE FROM users WHERE id = 3` | `1 row(s) deleted from 'users'.` |

**Rules:**

- `WHERE` is optional and supports exactly **one** `column = value` condition. Matching is exact and case-sensitive.
- `UPDATE` and `DELETE FROM` without a `WHERE` clause affect **all rows**.
- Values containing spaces must be enclosed in `'single'` or `"double"` quotes.

### Key/value store (in memory)

| Operation | Example | Success response |
|---|---|---|
| Set a key | `SET greeting hello world` | `OK` |
| Get a key | `GET greeting` | `hello world` |
| Delete a key | `DELETE greeting` | `DELETED` |

The complete grammar, naming rules, and error reference are documented in **[docs/query-language.md](docs/query-language.md)**.

---

## HTTP API

| Method | Path | Request body | Response |
|---|---|---|---|
| `GET` | `/` | — | `200 OK`, plain-text banner |
| `POST` | `/query` | `{"query": "..."}` (JSON) | `200 OK` with `{"response": "..."}` on success; `400 Bad Request` with a plain-text error on failure |
| `GET` | `/playground/` | — | The [web playground](#web-playground) (`/playground` redirects here) |

Example error response:

```
POST /query  {"query": "SELECT * FROM missing"}
→ 400 Bad Request   (text/plain)
Table 'missing' does not exist.
```

Status codes, response formats, and client examples in curl, PowerShell, JavaScript, and Python are documented in **[docs/http-api.md](docs/http-api.md)**.

---

## Configuration

DrastDB is configured through environment variables.

| Variable | Default | Description |
|---|---|---|
| `DRAST_ADDR` | `127.0.0.1:3495` | Address and port the server binds to. Use `0.0.0.0:<port>` to accept connections from other hosts or from outside a container. |
| `DRAST_CORS_ORIGINS` | *(none)* | Additional comma-separated origins permitted to call the API from a browser (e.g. `https://my-app.vercel.app`). `localhost` and `127.0.0.1` are always permitted; `*` permits all origins. |
| `DRAST_PLAYGROUND_DIR` | `frontend/dist` (`/app/playground` in Docker) | Directory containing the built [web playground](#web-playground). Relative paths are resolved against the server's working directory. |

**Examples:**

```bash
DRAST_ADDR=0.0.0.0:8080 cargo run                # bash
```

```powershell
$env:DRAST_ADDR = "0.0.0.0:8080"; cargo run       # PowerShell
```

> **Note:** Table files are written to `./dbfiles/`, **relative to the directory from which the server is started**.

---

## Storage Format

Each table is stored as a UTF-8 text file at `./dbfiles/<table>.db`. The first line contains the column names; each subsequent line represents one row, with values separated by tab characters:

```
id	name	age
1	Soumya Jaiswal	20
2	Rahul Kumar	21
3	Amit
```

These files can be inspected with any text editor. Because tabs and newlines act as delimiters, they cannot appear *within* values.

The key/value store is an in-memory `HashMap` shared across all clients. Its contents are **discarded when the server stops**.

For a detailed description of the internals, see [docs/architecture.md](docs/architecture.md).

---

## Project Structure

```
drast/
├── Cargo.toml          # Package manifest (axum, tokio, serde, tower-http)
├── Dockerfile          # Multi-stage build (playground + server)
├── .dockerignore
├── README.md
├── assets/logo/        # Logo, icon, and social preview image
├── docs/               # Detailed documentation
│   ├── query-language.md
│   ├── http-api.md
│   ├── architecture.md
│   └── deployment.md
├── frontend/           # DrastDB Playground (React + Vite)
└── src/
    ├── main.rs         # Entry point: reads DRAST_ADDR, builds the router, starts the server
    ├── executor.rs     # POST /query handler: parse → execute → JSON response
    ├── parser.rs       # Tokenizer, query parser, and table storage (dbfiles/ I/O)
    ├── engine.rs       # In-memory key/value store and response formatting
    ├── cors.rs         # Browser origin policy for the API
    ├── playground.rs   # Serves the built playground at /playground/
    ├── handlers.rs     # GET / handler
    └── helpers.rs      # Startup message
```

---

## Documentation

| Document | Contents |
|---|---|
| [docs/query-language.md](docs/query-language.md) | Complete command syntax, value and naming rules, examples, and error reference |
| [docs/http-api.md](docs/http-api.md) | Endpoints, request/response formats, status codes, and client examples in multiple languages |
| [docs/architecture.md](docs/architecture.md) | Request lifecycle, storage format, concurrency model, and design notes |
| [docs/deployment.md](docs/deployment.md) | Local and Docker deployment, Docker Compose, backups, and troubleshooting |
| [frontend/README.md](frontend/README.md) | Playground usage, keyboard shortcuts, development mode, and alternative hosting |

---

## Limitations

DrastDB is intentionally minimal. Please review the following constraints before relying on it:

- **Untyped values.** All values are stored as strings; for example, `WHERE age = 020` does not match `20`.
- **Single-condition filtering.** `WHERE` accepts one equality condition only. `AND`, `OR`, `<`, `>`, `!=`, and `LIKE` are not supported.
- **No advanced query features.** `ORDER BY`, `LIMIT`, `JOIN`, indexes, and transactions are not supported.
- **No write locking.** Concurrent writes to the same table may result in lost updates, as each write reads, modifies, and rewrites the entire file without locking.
- **Full-file reads.** Every table query reads the entire file, so performance degrades as tables grow.
- **Volatile key/value store.** Key/value data is not persisted and is lost on restart.
- **No authentication.** Any client that can reach the port can read and modify data via the API or the playground. Browser access is restricted to the playground and `localhost` pages unless additional origins are permitted via `DRAST_CORS_ORIGINS`.

Potential approaches for addressing these limitations are outlined in [docs/architecture.md](docs/architecture.md#limitations-and-ideas-for-improvement).

---

## Development

### Server

```bash
cargo build              # Debug build
cargo run                # Build and start the server
cargo build --release    # Optimized build → target/release/drast
cargo fmt                # Format source code
cargo clippy             # Run the linter
docker build -t drast .  # Build the Docker image (server + playground)
```

### Playground

Run the following from `frontend/`:

```bash
npm install              # Install dependencies
npm run dev              # Development server with hot reload at http://localhost:5173
npm run build            # Production build to frontend/dist (served at /playground/)
npm run lint             # Lint with oxlint
```

### Dependencies

| Crate | Version | Purpose |
|---|---|---|
| `axum` | 0.8 | HTTP routing and JSON extraction |
| `tokio` | 1 (`full`) | Async runtime, TCP listener, and async file I/O |
| `serde` | 1 (`derive`) | JSON request/response serialization |
| `tower-http` | 0.7 (`cors`, `fs`) | CORS handling for browser clients and static file serving for the playground |
