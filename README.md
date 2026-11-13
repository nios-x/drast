<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/drastdb-logo-white.svg">
    <img alt="DrastDB" src="assets/logo/drastdb-logo-black.svg" height="48">
  </picture>
</h1>

**DrastDB is a small database server written in Rust.** You send it SQL-like queries over HTTP and it stores your data in plain-text files on disk. It also has a built-in in-memory key/value store, and a web playground for running queries in your browser.

It is built with [axum](https://github.com/tokio-rs/axum) and [tokio](https://tokio.rs), and is meant for learning and small projects. It is not a production database.

Try it with one command, then open **http://127.0.0.1:3495/playground/**:

```bash
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles soumya7708/drast
```

Or send it a query from the terminal:

```bash
curl -X POST http://127.0.0.1:3495/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT name, age FROM users WHERE id = 2"}'
```
```json
{"response":"name\tage\nRahul\t22\n(1 row(s))"}
```

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Your first queries](#your-first-queries)
- [Web playground](#web-playground)
- [Command cheat sheet](#command-cheat-sheet)
- [HTTP API at a glance](#http-api-at-a-glance)
- [Configuration](#configuration)
- [How data is stored](#how-data-is-stored)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Limitations](#limitations)
- [Development](#development)

---

## Features

- **SQL-like tables**: `CREATE TABLE`, `DROP TABLE`, `SHOW TABLES`, `INSERT`, `SELECT`, `UPDATE` and `DELETE FROM`, with an optional `WHERE col = value` filter.
- **Web playground**: a browser UI for writing queries, browsing tables, and checking history, served by the server itself at `/playground/`.
- **Key/value store**: `SET`, `GET` and `DELETE` keep values in memory. It is fast, but the data is lost when the server restarts.
- **HTTP API**: a single `POST /query` endpoint that takes and returns JSON.
- **Human-readable storage**: each table is one tab-separated text file in `./dbfiles/`.
- **Clear error messages**: invalid queries return `400 Bad Request` with an explanation such as `Unknown column 'email'.`
- **Docker support**: a prebuilt image on Docker Hub (`soumya7708/drast`), plus a multi-stage `Dockerfile` that produces a small image running as a non-root user.

---

## Quick start

### Option 1: Run the Docker image (easiest)

You only need [Docker](https://docs.docker.com/get-docker/). There is nothing to clone or build. One command pulls the prebuilt image [`soumya7708/drast`](https://hub.docker.com/r/soumya7708/drast) from Docker Hub and starts the server:

```bash
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles soumya7708/drast
```

The command works the same in bash, PowerShell and Command Prompt. Here is what each part does:

| Part | Meaning |
|---|---|
| `-d` | Run in the background. |
| `--name drast` | Name the container `drast` so you can stop and start it easily. |
| `-p 3495:3495` | Make the server reachable at `http://127.0.0.1:3495` on your machine. To use another port, change the first number, for example `-p 8080:3495`. |
| `-v drast-data:/app/dbfiles` | Save your tables in a Docker volume called `drast-data`, so they are kept when the container is stopped, removed or updated. |
| `soumya7708/drast` | The image to run. |

Check that it is running:

```bash
curl http://127.0.0.1:3495/
```
```
DrastDB is a Simple Mini DB made in Rust.
API Server is Running...
```

Open **http://127.0.0.1:3495/playground/** in your browser to use the [web playground](#web-playground), or jump to [Your first queries](#your-first-queries) to use curl.

Useful commands:

```bash
docker logs drast                 # show the server output
docker stop drast                 # stop the server
docker start drast                # start it again (your tables are still there)

# Update to the latest image (your tables are kept in the drast-data volume)
docker pull soumya7708/drast
docker rm -f drast
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles soumya7708/drast
```

### Option 2: Run with Cargo

You need **Rust 1.85 or newer**, because the project uses the 2024 edition. It has been tested with Rust 1.96.

```bash
git clone https://github.com/nios-x/drast.git
cd drast
cargo run
```

You should see:

```
DrastDB is running...
Playground: not built (frontend/dist has no index.html), see /playground/
```

The second line says whether the [web playground](#web-playground) is available. To build it, see that section.

The server is now listening on **http://127.0.0.1:3495**. To check it:

```bash
curl http://127.0.0.1:3495/
```
```
DrastDB is a Simple Mini DB made in Rust.
API Server is Running...
```

### Option 3: Build the Docker image yourself

Use this if you have changed the code and want to run your own version in Docker. The build compiles both the server and the playground, so you don't need Rust or Node.js installed:

```bash
git clone https://github.com/nios-x/drast.git
cd drast
docker build -t drast .
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles drast
```

The `-v drast-data:/app/dbfiles` part stores your tables in a named Docker volume, so they survive when the container is removed or recreated. See [docs/deployment.md](docs/deployment.md) for more.

---

## Your first queries

Every query is sent as JSON to `POST /query`:

```json
{ "query": "<your query here>" }
```

### Using curl (Linux, macOS, Git Bash)

```bash
# Create a table
curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE users (id, name, age)"}'

# Insert rows (inside JSON, write quotes as \")
curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO users VALUES (1, \"Soumya Jaiswal\", 20)"}'

curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO users VALUES (2, Rahul, 22)"}'

# Read them back
curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users"}'
```

### Using PowerShell (Windows)

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

## Web playground

**DrastDB Playground** is a black-themed browser UI for the database. Its code is in [`frontend/`](frontend/), and the server serves it at **`/playground/`**, for example **http://127.0.0.1:3495/playground/**. It talks to the server it was loaded from, so there is nothing to configure.

- **Docker image:** the playground is already included. Open `/playground/` after `docker run`.
- **`cargo run`:** build the playground once with [Node.js](https://nodejs.org) 20.19 or newer, then start the server from the repository root:

  ```bash
  cd frontend
  npm install
  npm run build
  cd ..
  cargo run
  ```

  The server reads the built files from `frontend/dist`. Set `DRAST_PLAYGROUND_DIR` to use another folder.
- **Working on the playground itself:** run `npm run dev` in `frontend/` and open **http://localhost:5173** for hot reload.

Each line in the editor is one query: press `Ctrl+Enter` (`⌘+Enter` on macOS) to run the line under the cursor, or `Ctrl+Shift+Enter` to run every line. The sidebar lists your tables, has a form for the key/value store, and keeps a history of everything you've run. See [frontend/README.md](frontend/README.md) for details.

---

## Command cheat sheet

Keywords are case-insensitive: `select`, `SELECT` and `Select` all work. Do **not** end queries with a semicolon.

### Tables (saved to disk)

| Command | Example | Success response |
|---|---|---|
| Create a table | `CREATE TABLE users (id, name, age)` | `Table 'users' created.` |
| Delete a table | `DROP TABLE users` | `Table 'users' dropped.` |
| List tables | `SHOW TABLES` | each table with its columns and row count |
| Insert a full row | `INSERT INTO users VALUES (1, 'Soumya', 20)` | `1 row inserted into 'users'.` |
| Insert some columns | `INSERT INTO users (id, name) VALUES (3, 'Amit')` | `1 row inserted into 'users'.` |
| Select all columns | `SELECT * FROM users` | header, rows, `(N row(s))` |
| Select some columns | `SELECT name, age FROM users WHERE id = 2` | header, rows, `(N row(s))` |
| Update rows | `UPDATE users SET name = 'Rahul Kumar', age = 21 WHERE id = 2` | `1 row(s) updated in 'users'.` |
| Delete rows | `DELETE FROM users WHERE id = 3` | `1 row(s) deleted from 'users'.` |

- `WHERE` is optional and supports exactly **one** `column = value` condition. Values must match exactly, including case.
- `UPDATE` and `DELETE FROM` without `WHERE` affect **every row**.
- Values containing spaces must be quoted with `'single'` or `"double"` quotes.

### Key/value store (in memory)

| Command | Example | Success response |
|---|---|---|
| Set a key | `SET greeting hello world` | `OK` |
| Get a key | `GET greeting` | `hello world` |
| Delete a key | `DELETE greeting` | `DELETED` |

The full syntax, rules and every error message are in **[docs/query-language.md](docs/query-language.md)**.

---

## HTTP API at a glance

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/` | none | `200`, plain-text banner |
| `POST` | `/query` | `{"query": "..."}` (JSON) | `200` `{"response": "..."}` on success, `400` plain-text error on failure |
| `GET` | `/playground/` | none | The [web playground](#web-playground) (`/playground` redirects here) |

```
POST /query  {"query": "SELECT * FROM missing"}
→ 400 Bad Request   (text/plain)
Table 'missing' does not exist.
```

Status codes, response formats and client examples in curl, PowerShell, JavaScript and Python are in **[docs/http-api.md](docs/http-api.md)**.

---

## Configuration

| Environment variable | Default | Description |
|---|---|---|
| `DRAST_ADDR` | `127.0.0.1:3495` | The address and port the server listens on. Use `0.0.0.0:<port>` to accept connections from other machines or from outside a container. |
| `DRAST_CORS_ORIGINS` | *(none)* | Extra web origins allowed to call the API from a browser, comma-separated, e.g. `https://my-app.vercel.app`. Pages on `localhost` / `127.0.0.1` are always allowed. `*` allows every origin. |
| `DRAST_PLAYGROUND_DIR` | `frontend/dist` (`/app/playground` in Docker) | The folder holding the built [web playground](#web-playground), served at `/playground/`. A relative path is relative to the directory you start the server from. |

```bash
DRAST_ADDR=0.0.0.0:8080 cargo run        # bash
```
```powershell
$env:DRAST_ADDR = "0.0.0.0:8080"; cargo run   # PowerShell
```

Tables are saved in `./dbfiles/`, **relative to the directory you start the server from**.

---

## How data is stored

Each table is a plain UTF-8 text file at `./dbfiles/<table>.db`. The first line holds the column names and each following line holds one row, with values separated by tabs:

```
id	name	age
1	Soumya Jaiswal	20
2	Rahul Kumar	21
3	Amit
```

You can open these files in any text editor. Because tabs and newlines separate values, they are not allowed *inside* values.

The key/value store is a `HashMap` held in memory. It is shared by all clients and is **cleared when the server stops**.

More detail is in [docs/architecture.md](docs/architecture.md).

---

## Project structure

```
drast/
├── Cargo.toml          # Package manifest (axum, tokio, serde, tower-http)
├── Dockerfile          # Multi-stage Docker build (playground + server)
├── .dockerignore
├── README.md
├── assets/logo/        # Logo, icon and social preview image
├── docs/               # Detailed documentation
│   ├── query-language.md
│   ├── http-api.md
│   ├── architecture.md
│   └── deployment.md
├── frontend/           # DrastDB Playground (React + Vite web UI)
└── src/
    ├── main.rs         # Entry point: reads DRAST_ADDR, builds the router, starts the server
    ├── executor.rs     # POST /query handler: parse → execute → JSON response
    ├── parser.rs       # Tokenizer, query parser, and table storage (reads/writes dbfiles/)
    ├── engine.rs       # In-memory key/value store and response formatting
    ├── cors.rs         # Which browser origins may call the API
    ├── playground.rs   # Serves the built playground at /playground/
    ├── handlers.rs     # GET / handler
    └── helpers.rs      # Startup message
```

---

## Documentation

| Document | What's inside |
|---|---|
| [docs/query-language.md](docs/query-language.md) | Full syntax for every command, value and naming rules, examples, and an error reference |
| [docs/http-api.md](docs/http-api.md) | Endpoints, request and response formats, status codes, client code in several languages |
| [docs/architecture.md](docs/architecture.md) | How a request flows through the code, the storage format, concurrency, and design notes |
| [docs/deployment.md](docs/deployment.md) | Running locally and in Docker, Docker Compose, backups, and troubleshooting |
| [frontend/README.md](frontend/README.md) | Using the web playground, keyboard shortcuts, development mode, and hosting it elsewhere |

---

## Limitations

DrastDB is deliberately simple. Before you rely on it, know that:

- **All values are strings.** There are no types, so `WHERE age = 020` does not match `20`.
- **`WHERE` takes one equality condition.** There is no `AND`/`OR`, `<`, `>`, `!=` or `LIKE`.
- **There is no `ORDER BY`, `LIMIT`, `JOIN`, index or transaction.**
- **Concurrent writes to the same table can lose updates.** Each write reads the whole file, changes it and writes it back without a lock.
- **Every table query reads the whole file.** Performance drops as tables grow.
- **The key/value store is not saved.** It is lost on restart.
- **There is no authentication.** Anyone who can reach the port can read and change data, through the API or the playground at `/playground/`. In a browser, only the playground and pages on `localhost` can call the API, unless you allow more origins with `DRAST_CORS_ORIGINS`.

[docs/architecture.md](docs/architecture.md#limitations-and-ideas-for-improvement) lists ideas for removing these limits.

---

## Development

```bash
cargo build              # debug build
cargo run                # build and start the server
cargo build --release    # optimized build → target/release/drast
cargo fmt                # format the code
cargo clippy             # lint
docker build -t drast .  # build the Docker image (server + playground)
```

For the playground, in `frontend/`:

```bash
npm install              # install dependencies
npm run dev              # dev server with hot reload on http://localhost:5173
npm run build            # build to frontend/dist, served by the server at /playground/
npm run lint             # lint with oxlint
```

### Dependencies

| Crate | Purpose |
|---|---|
| `axum` 0.8 | HTTP routing and JSON extraction |
| `tokio` 1 (full) | Async runtime, TCP listener, async file I/O |
| `serde` 1 (derive) | JSON request/response (de)serialization |
| `tower-http` 0.7 (cors, fs) | CORS headers for browser clients, and serving the playground's static files |
