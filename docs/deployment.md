# Deployment

How to run DrastDB on your machine and in Docker, how to configure it, how to back up your data, and how to fix common problems.

- [Requirements](#requirements)
- [Running locally](#running-locally)
- [Configuration](#configuration)
- [Docker](#docker)
- [Docker Compose](#docker-compose)
- [Backups](#backups)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| To | You need |
|---|---|
| Build and run from source | [Rust](https://rustup.rs) **1.85 or newer** (the project uses edition 2024; tested with 1.96) |
| Run in a container | [Docker](https://docs.docker.com/get-docker/), or Docker Desktop on Windows and macOS |

---

## Running locally

### Development build

```bash
cargo run
```

This compiles a debug build and starts the server on `127.0.0.1:3495`. Stop it with `Ctrl+C`.

### Release build

A release build is optimized and much faster:

```bash
cargo build --release
```

The binary is at:

- Linux/macOS: `target/release/drast`
- Windows: `target\release\drast.exe`

Copy it anywhere and run it. Nothing else is needed at runtime.

### Where the data goes

Tables are written to `./dbfiles/`, **relative to the directory the server is started from**, not the folder the binary is in:

```bash
cd /srv/drast-data
/opt/drast/drast          # tables go to /srv/drast-data/dbfiles/
```

Running `cargo run` from the project folder creates `dbfiles/` inside the project. Add it to `.gitignore` if you don't want to commit your data:

```gitignore
/target
/dbfiles
```

---

## Configuration

| Environment variable | Default | Description |
|---|---|---|
| `DRAST_ADDR` | `127.0.0.1:3495` | The `host:port` to listen on |

| Value | Meaning |
|---|---|
| `127.0.0.1:3495` | Only this machine can connect (safe default) |
| `0.0.0.0:3495` | Any machine on the network can connect (required inside Docker) |
| `127.0.0.1:8080` | A different port |

Setting it:

```bash
# Linux / macOS / Git Bash
DRAST_ADDR=0.0.0.0:8080 cargo run
```

```powershell
# PowerShell
$env:DRAST_ADDR = "0.0.0.0:8080"
cargo run
```

```bat
:: Command Prompt
set DRAST_ADDR=0.0.0.0:8080
cargo run
```

> ⚠️ DrastDB has **no authentication**. Only use `0.0.0.0` on a network you trust, or behind a reverse proxy that adds auth.

---

## Docker

### What the Dockerfile does

The [`Dockerfile`](../Dockerfile) has two stages.

1. **Build stage** (`rust:1.96-slim-bookworm`)
   - Copies `Cargo.toml` and `Cargo.lock` and builds the dependencies alone first. This layer is cached, so later builds after code changes take seconds instead of minutes.
   - Copies `src/` and builds the release binary with `--locked`, using the exact versions in `Cargo.lock`.
2. **Runtime stage** (`debian:bookworm-slim`)
   - Contains only the compiled binary at `/usr/local/bin/drast`, without the Rust toolchain.
   - Creates an unprivileged `drast` user and runs as that user.
   - Sets `WORKDIR /app`, so tables live in `/app/dbfiles`, which is declared as a `VOLUME`.
   - Sets `DRAST_ADDR=0.0.0.0:3495` and `EXPOSE 3495`.

[`.dockerignore`](../.dockerignore) keeps `target/`, `dbfiles/` and `.git` out of the build context, so builds stay fast and your local data never ends up in the image.

### Build

```bash
docker build -t drast .
```

The first build downloads the Rust image (about 300 MB) and compiles all dependencies, which takes a few minutes. Later builds reuse the cache.

### Run

```bash
docker run -d --name drast -p 3495:3495 -v drast-data:/app/dbfiles drast
```

| Flag | Purpose |
|---|---|
| `-d` | Run in the background |
| `--name drast` | Name the container so you can refer to it later |
| `-p 3495:3495` | Map host port 3495 to container port 3495 |
| `-v drast-data:/app/dbfiles` | Keep tables in a **named volume** that survives container removal |

Check it:

```bash
curl http://127.0.0.1:3495/
```

### Everyday commands

```bash
docker logs drast          # see output ("DrastDB is running...")
docker stop drast          # stop (data is kept)
docker start drast         # start again
docker rm -f drast         # remove the container (data in drast-data is kept)
docker volume rm drast-data   # ⚠️ delete all table data
```

### Using a different host port

If port 3495 is busy, for example because you're also running `cargo run`, change only the **left** side:

```bash
docker run -d --name drast -p 8080:3495 -v drast-data:/app/dbfiles drast
# → http://127.0.0.1:8080
```

### About the data volume

- **Named volume** (`-v drast-data:/app/dbfiles`, recommended): Docker manages the storage, and it keeps the right permissions automatically.
- **No `-v` flag**: Docker creates an anonymous volume. Data survives `stop`/`start`, but a new container won't see it.
- **Bind mount** (`-v ./mydata:/app/dbfiles`): the files appear directly in a host folder. This works out of the box on Docker Desktop (Windows/macOS). On Linux, the container's `drast` user must be able to write to that folder, or you'll get `Permission denied (os error 13)` on `CREATE TABLE`.

---

## Docker Compose

Save as `compose.yaml` next to the `Dockerfile`:

```yaml
services:
  drast:
    build: .
    image: drast
    ports:
      - "3495:3495"
    volumes:
      - drast-data:/app/dbfiles
    restart: unless-stopped

volumes:
  drast-data:
```

```bash
docker compose up -d --build   # build and start
docker compose logs -f         # follow logs
docker compose down            # stop and remove (volume is kept)
```

---

## Backups

All table data is the set of `.db` files in `dbfiles/`. Back up those files, and you have backed up everything. The in-memory key/value store cannot be backed up.

### Local

Copy the folder:

```bash
cp -r dbfiles dbfiles-backup-$(date +%F)
```

### Docker

**Back up** (works while the container is running):

```bash
docker cp drast:/app/dbfiles ./backup
```

**Restore** into the `drast-data` volume (stop the container first):

```bash
docker stop drast
docker run --rm --user root --entrypoint sh \
  -v drast-data:/app/dbfiles -v "$PWD/backup":/backup \
  drast -c 'cp /backup/*.db /app/dbfiles/ && chown -R drast:drast /app/dbfiles'
docker start drast
```

The `chown` step makes the restored files writable by the container's `drast` user.

---

## Troubleshooting

### The server exits immediately with `AddrInUse`

```
called `Result::unwrap()` on an `Err` value: Os { ... kind: AddrInUse, ... }
```

Another program, often another DrastDB, is already using the port. Stop it, or pick a different port with `DRAST_ADDR` (or `-p` in Docker).

Find what's using port 3495:

```bash
# Linux / macOS
lsof -i :3495
```
```powershell
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3495).OwningProcess
```

### The container is running but I can't connect

- Check that you passed `-p 3495:3495`. `docker ps` should show `0.0.0.0:3495->3495/tcp`.
- Check that `DRAST_ADDR` is `0.0.0.0:...` inside the container (the image sets this). With `127.0.0.1`, the server only accepts connections from inside the container.

### `415 Unsupported Media Type`

Add the header `Content-Type: application/json` to your request.

### `422 Unprocessable Entity`

The JSON body has no `query` string field. Send `{"query": "..."}`.

### `Invalid table name.` on a query that looks fine

You probably ended the query with `;`. Remove it.

### `Unexpected '...'` after a value

A value with spaces isn't quoted. Write `WHERE name = 'Soumya Jaiswal'`, not `WHERE name = Soumya Jaiswal`.

### My key/value data disappeared

The key/value store lives only in memory and is cleared on every restart. Use a table if you need data to persist.

### `Permission denied (os error 13)` in Docker

The container's `drast` user cannot write to the mounted folder. Use a named volume (`-v drast-data:/app/dbfiles`), or on Linux give the host folder write permission for that user.
