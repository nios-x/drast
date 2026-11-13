# Query Language Reference

This page documents every command DrastDB understands, the rules for names and values, and every error message the server can return.

All examples show the query string you put in the `"query"` field of a `POST /query` request (see [http-api.md](http-api.md)), followed by the server's response.

- [General rules](#general-rules)
- [Table commands](#table-commands)
  - [CREATE TABLE](#create-table)
  - [DROP TABLE](#drop-table)
  - [SHOW TABLES](#show-tables)
  - [INSERT INTO](#insert-into)
  - [SELECT](#select)
  - [UPDATE](#update)
  - [DELETE FROM](#delete-from)
  - [The WHERE clause](#the-where-clause)
- [Key/value commands](#keyvalue-commands)
  - [SET](#set)
  - [GET](#get)
  - [DELETE](#delete)
- [Error reference](#error-reference)

---

## General rules

### Keywords

Keywords are **case-insensitive**: `SELECT`, `select` and `SeLeCt` all work. This covers `CREATE`, `TABLE`, `DROP`, `SHOW`, `TABLES`, `INSERT`, `INTO`, `VALUES`, `SELECT`, `FROM`, `WHERE`, `UPDATE`, `SET`, `DELETE`, `GET`.

### No semicolons

Do **not** end a query with `;`. The semicolon becomes part of the last word and causes an error:

```
SELECT * FROM users;      →  400  Invalid table name.
```

### Names (tables and columns)

Table and column names must:

- contain only ASCII letters, digits and underscores (`A–Z`, `a–z`, `0–9`, `_`)
- not be empty

| Name | Valid? |
|---|---|
| `users`, `order_items`, `Table2`, `2024_sales` | ✅ |
| `user-list`, `my table`, `naïve`, `users;` | ❌ |

**Column names are case-sensitive.** In a table created with `(id, Name)`, the column `name` does not exist.

**Table names follow your file system.** Each table is a file, so `Users` and `users` are the same table on Windows and macOS but different tables on Linux, including inside Docker. Use one consistent casing.

### Values

All values are stored as **text**. There are no numbers, booleans or `NULL`, so `20` is just the two characters `2` and `0`.

A value can be written in three ways:

| Style | Example | Notes |
|---|---|---|
| Unquoted | `Rahul`, `22`, `a@b.c` | Cannot contain spaces or any of `( ) , = * ' "` |
| Single-quoted | `'Soumya Jaiswal'` | Can contain spaces, symbols and `"` |
| Double-quoted | `"Soumya Jaiswal"` | Can contain spaces, symbols and `'` |

Rules for quoted values:

- A value opened with `'` must be closed with `'`, and likewise for `"`. There is **no escape character**, so a value cannot contain its own quote character. Use the other quote style: `"it's"` or `'say "hi"'`.
- `''` (an empty pair of quotes) stores an empty string.
- **Tabs and newlines are not allowed** inside values, because they separate values and rows in the storage file.
- Non-ASCII text such as `'नमस्ते'` or `'Café'` is fine inside values.

### Whitespace

Extra spaces are ignored between words and around `( ) , =`. These two queries are the same:

```
INSERT INTO users VALUES (1, 'Amit', 30)
INSERT INTO users VALUES(1,'Amit',30)
```

---

## Table commands

Table commands read and write files in `./dbfiles/`. Their effects survive server restarts.

### CREATE TABLE

Creates a new, empty table.

```
CREATE TABLE <table> (<column1>, <column2>, ...)
```

**Example**

```
CREATE TABLE users (id, name, age)
→ 200  Table 'users' created.
```

**Rules**

- At least one column is required.
- Column names must be valid [names](#names-tables-and-columns) and must not repeat.
- The `./dbfiles/` folder is created automatically if it doesn't exist.

**Errors**

```
CREATE TABLE users (id, name)       →  400  Table 'users' already exists.
CREATE TABLE bad (id, id)           →  400  Duplicate column 'id'.
CREATE TABLE bad (id, first-name)   →  400  Invalid column name 'first-name'.
CREATE TABLE bad-name (id)          →  400  Invalid table name.
```

---

### DROP TABLE

Deletes a table and all its rows permanently.

```
DROP TABLE <table>
```

**Example**

```
DROP TABLE users
→ 200  Table 'users' dropped.
```

**Errors**

```
DROP TABLE users          →  400  Table 'users' does not exist.   (if already dropped)
DROP users                →  400  Usage: DROP TABLE <table_name>
DROP TABLE a b            →  400  Usage: DROP TABLE <table_name>
```

> ⚠️ There is no undo. The table's file is deleted from disk.

---

### SHOW TABLES

Lists every table, with its columns and how many rows it has.

```
SHOW TABLES
```

**Example**

```
SHOW TABLES
→ 200
table	columns	rows
orders	id, item	0
users	id, name, age	1
(2 row(s))
```

**Rules**

- Tables are listed in alphabetical order.
- The response has the same shape as a `SELECT` result: a header line, one line per table, and a `(N row(s))` footer. The `columns` value is the column names joined with `, `.
- With no tables (or no `dbfiles/` folder yet), you get only the header and `(0 row(s))`.
- Files in `dbfiles/` that aren't valid tables (wrong extension, invalid name, empty file) are skipped.

**Errors**

```
SHOW TABLE            →  400  Usage: SHOW TABLES
SHOW TABLES users     →  400  Usage: SHOW TABLES
```

---

### INSERT INTO

Adds **one** row to a table. There are two forms.

#### Form 1: values for every column

```
INSERT INTO <table> VALUES (<value1>, <value2>, ...)
```

Give one value per column, in the order the columns were created.

```
INSERT INTO users VALUES (1, 'Soumya Jaiswal', 20)
→ 200  1 row inserted into 'users'.

INSERT INTO users VALUES (2, Rahul, 22)
→ 200  1 row inserted into 'users'.
```

#### Form 2: values for chosen columns

```
INSERT INTO <table> (<columnA>, <columnB>, ...) VALUES (<valueA>, <valueB>, ...)
```

Columns you leave out are stored as an **empty string**. The columns can be listed in any order.

```
INSERT INTO users (id, name) VALUES (3, 'Amit')
→ 200  1 row inserted into 'users'.
```

Row 3 now has an empty `age`.

**Errors**

```
INSERT INTO users VALUES (4, 'x')                    →  400  Expected 3 values, got 2.
INSERT INTO users (id, name) VALUES (4)              →  400  Column count doesn't match value count.
INSERT INTO users (id, email) VALUES (4, 'a@b.c')    →  400  Unknown column 'email'.
INSERT INTO missing VALUES (1)                       →  400  Table 'missing' does not exist.
INSERT INTO users VALUES (5, 'unclosed)              →  400  Unclosed quote.
```

> DrastDB does not check for duplicates. Inserting the same `id` twice creates two rows.

---

### SELECT

Reads rows from a table.

```
SELECT * FROM <table> [WHERE <column> = <value>]
SELECT <column1>, <column2>, ... FROM <table> [WHERE <column> = <value>]
```

- `*` returns all columns in table order.
- A column list returns those columns in the order you list them. The same column can be listed twice.
- Rows are returned in the order they were inserted.

**Examples**

```
SELECT * FROM users
→ 200
id	name	age
1	Soumya Jaiswal	20
2	Rahul	22
3	Amit
(3 row(s))
```

```
SELECT name, age FROM users WHERE id = 2
→ 200
name	age
Rahul	22
(1 row(s))
```

```
select * from users where name = 'Soumya Jaiswal'
→ 200
id	name	age
1	Soumya Jaiswal	20
(1 row(s))
```

**Response format**

- Line 1 holds the column names, separated by tabs.
- Each following line is one row, with values separated by tabs. Empty values appear as nothing between two tabs.
- The last line is `(N row(s))`.
- Lines are separated by `\n`.

If no rows match, you get only the header and `(0 row(s))`.

**Errors**

```
SELECT * FROM missing                              →  400  Table 'missing' does not exist.
SELECT email FROM users                            →  400  Unknown column 'email'.
SELECT * FROM users WHERE name = Soumya Jaiswal    →  400  Unexpected 'Jaiswal'.     (quote values with spaces)
SELECT *, id FROM users                            →  400  Expected 'FROM', found ','.
SELECT * FROM users ORDER BY id                    →  400  Expected 'WHERE', found 'ORDER'.
```

---

### UPDATE

Changes values in existing rows.

```
UPDATE <table> SET <column> = <value>[, <column> = <value> ...] [WHERE <column> = <value>]
```

**Example**

```
UPDATE users SET name = 'Rahul Kumar', age = 21 WHERE id = 2
→ 200  1 row(s) updated in 'users'.
```

**Rules**

- You can set one or more columns, separated by commas.
- If the same column appears twice in `SET`, the last value wins.
- ⚠️ **Without `WHERE`, every row in the table is updated.**
- If no rows match, the response is `0 row(s) updated in '<table>'.` and this is not an error.

**Errors**

```
UPDATE users SET email = 'a@b.c'           →  400  Unknown column 'email'.
UPDATE users SET name 'x'                  →  400  Expected '=', found 'x'.
UPDATE users name = 'x'                    →  400  Expected 'SET', found 'name'.
UPDATE users SET age = 1 WHERE bogus = 2   →  400  Unknown column 'bogus'.
```

---

### DELETE FROM

Removes rows from a table. The table itself stays. Use [`DROP TABLE`](#drop-table) to remove the table.

```
DELETE FROM <table> [WHERE <column> = <value>]
```

**Examples**

```
DELETE FROM users WHERE id = 3
→ 200  1 row(s) deleted from 'users'.

DELETE FROM users WHERE id = 99
→ 200  0 row(s) deleted from 'users'.
```

> ⚠️ **`DELETE FROM users` without `WHERE` deletes every row.** The column definitions remain.

---

### The WHERE clause

`SELECT`, `UPDATE` and `DELETE FROM` accept an optional `WHERE` clause at the **end** of the query:

```
WHERE <column> = <value>
```

- Only **one** condition is allowed. There is no `AND` or `OR`.
- Only **equality** (`=`) is supported. There is no `!=`, `<`, `>` or `LIKE`.
- The comparison is an **exact, case-sensitive text match**:
  - `WHERE name = 'amit'` does not match `Amit`
  - `WHERE age = 020` does not match `20`
  - `WHERE age = ''` matches rows with an empty age
- Nothing may come after the value.

---

## Key/value commands

The key/value store is a separate, **in-memory** map from keys to text values. It has nothing to do with tables and is **cleared when the server restarts**. All clients share the same store.

Keys are case-sensitive and cannot contain spaces. Quotes are not special here: `SET 'a' b` stores the key `'a'`, quotes included.

### SET

Stores a value under a key. If the key exists, its value is replaced.

```
SET <key> <value...>
```

Everything after the key is the value. Runs of spaces inside the value are collapsed to single spaces.

```
SET greeting hello   world
→ 200  OK
```

```
SET greeting          →  400  Usage: SET <key> <value>
```

### GET

Returns the value stored under a key.

```
GET <key>
```

```
GET greeting
→ 200  hello world

GET nothing
→ 400  Key 'nothing' not found
```

```
GET a b               →  400  Usage: GET <key>
```

### DELETE

Removes a key.

```
DELETE <key>
```

```
DELETE greeting
→ 200  DELETED

DELETE greeting
→ 400  Key 'greeting' not found
```

```
DELETE a b            →  400  Usage: DELETE <key>
```

> `DELETE FROM ...` is always read as the table command. Because of this, a key named `from` (any case) can be set and read but cannot be deleted.

---

## Error reference

Every error returns HTTP **400 Bad Request** with the message as a plain-text body. `<x>` marks the part that changes.

### Parsing errors

| Message | Cause |
|---|---|
| `Empty Query` | The query was empty or only whitespace. |
| `Not a Valid Input. Try: ...` | The first word isn't a known command. The message lists every valid command form. |
| `Unexpected end of query.` | The query stopped too early, for example `SELECT * FROM` or `INSERT INTO users VALUES (1,`. |
| `Expected '<x>', found '<y>'.` | A required keyword or symbol is missing or misspelled, for example `UPDATE users name = 1`. |
| `Unexpected '<x>'.` | Extra text after the end of a valid query, often an unquoted value with spaces or a trailing `;`. |
| `Expected ',' or ')', found '<x>'.` | Something other than a comma or closing bracket inside `( ... )`, usually a missing comma. |
| `Unclosed quote.` | A value was opened with `'` or `"` but never closed. |
| `Tabs/newlines not allowed in values.` | A quoted value contains a tab or newline character. |

### Name errors

| Message | Cause |
|---|---|
| `Invalid table name.` | The table name contains characters other than letters, digits and `_`. |
| `Invalid column name '<x>'.` | Same rule, for a column in `CREATE TABLE`. |
| `Duplicate column '<x>'.` | `CREATE TABLE` lists the same column twice. |
| `Unknown column '<x>'.` | The column doesn't exist in the table (`SELECT`, `INSERT`, `UPDATE`, `WHERE`). |

### Table errors

| Message | Cause |
|---|---|
| `Table '<x>' already exists.` | `CREATE TABLE` for a name that is already used. |
| `Table '<x>' does not exist.` | Any table command on a missing table. |
| `Table '<x>' is corrupted.` | The table's file exists but is empty (it has no header line). |
| `Expected <n> values, got <m>.` | `INSERT ... VALUES` without a column list has the wrong number of values. |
| `Column count doesn't match value count.` | `INSERT` with a column list has a different number of columns and values. |

### Usage errors

| Message | Cause |
|---|---|
| `Usage: DROP TABLE <table_name>` | `DROP` without exactly `DROP TABLE <name>`. |
| `Usage: SHOW TABLES` | `SHOW` followed by anything other than `TABLES`. |
| `Usage: SET <key> <value>` | `SET` without a key and a value. |
| `Usage: GET <key>` | `GET` without exactly one key. |
| `Usage: DELETE <key>` | `DELETE` without exactly one key (and not `DELETE FROM`). |

### Key/value errors

| Message | Cause |
|---|---|
| `Key '<x>' not found` | `GET` or `DELETE` for a key that isn't set. |

### System errors

If the operating system refuses a file operation, for example because of a full disk or missing permissions, its error text is returned as-is with status 400, such as `Permission denied (os error 13)`.
