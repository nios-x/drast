# HTTP API Reference

DrastDB is used entirely over HTTP. It has two endpoints.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Health/info check |
| `POST` | `/query` | Run any query |

The base URL is `http://127.0.0.1:3495` by default. It can be changed with the `DRAST_ADDR` environment variable (see [deployment.md](deployment.md#configuration)).

- [GET /](#get-)
- [POST /query](#post-query)
- [Status codes](#status-codes)
- [Reading SELECT results](#reading-select-results)
- [Client examples](#client-examples)
- [Notes and limits](#notes-and-limits)

---

## GET /

Returns a short plain-text banner. Use it to check that the server is up.

**Request**

```http
GET / HTTP/1.1
Host: 127.0.0.1:3495
```

**Response**

```http
HTTP/1.1 200 OK
content-type: text/plain; charset=utf-8

DrastDB is a Simple Mini DB made in Rust.
API Server is Running...
```

---

## POST /query

Runs one query and returns its result.

### Request

| Part | Value |
|---|---|
| Header | `Content-Type: application/json` (required) |
| Body | A JSON object with a `query` string field |

```http
POST /query HTTP/1.1
Host: 127.0.0.1:3495
Content-Type: application/json

{"query": "SELECT * FROM users WHERE id = 2"}
```

- `query` is required. Any other fields in the object are ignored.
- Send **one query per request**. There is no batching and no `;`-separated list.
- The query syntax is documented in [query-language.md](query-language.md).

### Success response: `200 OK`

The body is JSON with a single `response` string:

```http
HTTP/1.1 200 OK
content-type: application/json

{"response":"1 row(s) updated in 'users'."}
```

The `response` text for each command:

| Command | `response` |
|---|---|
| `CREATE TABLE t ...` | `Table 't' created.` |
| `DROP TABLE t` | `Table 't' dropped.` |
| `INSERT INTO t ...` | `1 row inserted into 't'.` |
| `SELECT ...` | Tab-separated table, see [Reading SELECT results](#reading-select-results) |
| `UPDATE t ...` | `<n> row(s) updated in 't'.` |
| `DELETE FROM t ...` | `<n> row(s) deleted from 't'.` |
| `SET k v` | `OK` |
| `GET k` | the stored value |
| `DELETE k` | `DELETED` |

### Error response: `400 Bad Request`

When the query is invalid or fails, the body is a **plain-text message, not JSON**:

```http
HTTP/1.1 400 Bad Request
content-type: text/plain; charset=utf-8

Table 'missing' does not exist.
```

Every message is listed in the [error reference](query-language.md#error-reference).

> 💡 Check the status code (or `Content-Type`) **before** parsing the body as JSON.

---

## Status codes

| Code | Meaning | When it happens | Body |
|---|---|---|---|
| `200` | OK | The query ran successfully | JSON `{"response": "..."}` |
| `400` | Bad Request | The query is invalid or failed | Plain-text error message |
| `400` | Bad Request | The body is not valid JSON | `Failed to parse the request body as JSON: ...` |
| `415` | Unsupported Media Type | `Content-Type: application/json` header is missing | ``Expected request with `Content-Type: application/json` `` |
| `422` | Unprocessable Entity | Valid JSON, but no `query` string field | ``Failed to deserialize the JSON body into the target type: missing field `query` ...`` |
| `413` | Payload Too Large | The request body is larger than 2 MB | empty |
| `404` | Not Found | Unknown path | empty |
| `405` | Method Not Allowed | For example `GET /query` | empty |

The `415`, `422` and `413` responses, and the `400` for malformed JSON, come from axum before your query reaches DrastDB.

---

## Reading SELECT results

A `SELECT` returns its rows as one string inside `response`:

```json
{"response":"id\tname\tage\n1\tSoumya Jaiswal\t20\n2\tRahul\t22\n3\tAmit\t\n(3 row(s))"}
```

Printed, that looks like:

```
id	name	age
1	Soumya Jaiswal	20
2	Rahul	22
3	Amit	
(3 row(s))
```

To turn it into data:

1. Split the string on `\n`.
2. The **first** line holds the column names. Split it on `\t`.
3. The **last** line is the `(N row(s))` footer. Drop it.
4. Every line in between is a row. Split each on `\t`.

Values can never contain tabs or newlines (the server rejects them), so this split is always safe.

**JavaScript**

```js
function parseSelect(text) {
  const lines = text.split("\n");
  const columns = lines[0].split("\t");
  return lines.slice(1, -1).map(line => {
    const values = line.split("\t");
    return Object.fromEntries(columns.map((c, i) => [c, values[i] ?? ""]));
  });
}
// → [{ id: "1", name: "Soumya Jaiswal", age: "20" }, ...]
```

**Python**

```python
def parse_select(text):
    lines = text.split("\n")
    columns = lines[0].split("\t")
    return [dict(zip(columns, line.split("\t"))) for line in lines[1:-1]]
```

---

## Client examples

### curl (Linux, macOS, Git Bash, WSL)

```bash
curl -X POST http://127.0.0.1:3495/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users"}'
```

Inside a single-quoted shell string, write string values with `\"`:

```bash
curl -X POST http://127.0.0.1:3495/query \
  -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO users VALUES (1, \"Soumya Jaiswal\", 20)"}'
```

For long queries, put the JSON in a file:

```bash
echo '{"query": "SELECT name FROM users WHERE id = 1"}' > q.json
curl -X POST http://127.0.0.1:3495/query -H "Content-Type: application/json" --data-binary @q.json
```

Add `-i` to see the status code and headers.

### PowerShell (Windows)

In Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`. Use `Invoke-RestMethod`, which also decodes the JSON for you:

```powershell
$body = @{ query = "INSERT INTO users VALUES (1, 'Soumya Jaiswal', 20)" } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:3495/query -Method Post -ContentType 'application/json' -Body $body
```

A reusable helper that also shows error messages:

```powershell
function drast($q) {
  try {
    (Invoke-RestMethod -Uri http://127.0.0.1:3495/query -Method Post `
      -ContentType 'application/json' -Body (@{ query = $q } | ConvertTo-Json)).response
  } catch {
    Write-Error $_.ErrorDetails.Message
  }
}

drast "SELECT * FROM users"
drast "SELECT * FROM nope"     # → Table 'nope' does not exist.
```

### JavaScript (Node 18+ or Deno)

```js
async function drast(query) {
  const res = await fetch("http://127.0.0.1:3495/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(await res.text());   // 400 bodies are plain text
  return (await res.json()).response;
}

await drast("CREATE TABLE notes (id, text)");
await drast(`INSERT INTO notes VALUES (1, 'buy milk')`);
console.log(await drast("SELECT * FROM notes"));
```

> Calling DrastDB from a web page on another origin will be **blocked by the browser**, because the server sends no CORS headers. Call it from a backend instead, or add a CORS layer (for example `tower-http`'s `CorsLayer`) in `main.rs`.

### Python (requests)

```python
import requests

def drast(query):
    r = requests.post("http://127.0.0.1:3495/query", json={"query": query})
    if r.status_code != 200:
        raise RuntimeError(r.text)          # plain-text error message
    return r.json()["response"]

drast("CREATE TABLE notes (id, text)")
drast("INSERT INTO notes VALUES (1, 'buy milk')")
print(drast("SELECT * FROM notes"))
```

`json={...}` sets the `Content-Type: application/json` header for you.

---

## Notes and limits

- **No authentication.** Anyone who can reach the port can read and change all data. The default address `127.0.0.1` accepts local connections only. Only listen on `0.0.0.0` on a trusted network.
- **No CORS headers.** Browsers on other origins cannot call the API directly.
- **Request size.** Bodies over 2 MB (axum's default limit) are rejected with `413`.
- **Concurrency.** Requests are handled concurrently, but table writes are not locked. Two writes to the same table at the same moment can lose one of them. See [architecture.md](architecture.md#concurrency).
- **Encoding.** Requests and responses are UTF-8.
