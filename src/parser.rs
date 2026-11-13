use tokio::fs;
use tokio::fs::OpenOptions;

#[derive(Debug)]
pub enum Query {
    Set {
        key: String,
        value: String,
    },
    Get {
        key: String,
    },
    Remove {
        key: String,
    },
    CreateTable {
        key: String,
    },
    DeleteTable {
        key: String,
    },
    Insert {
        table: String,
    },
    Select {
        columns: Vec<String>,
        rows: Vec<Vec<String>>,
    },
    Update {
        table: String,
        count: usize,
    },
    DeleteRows {
        table: String,
        count: usize,
    },
}


struct Table {
    columns: Vec<String>,
    rows: Vec<Vec<String>>,
}

fn table_path(name: &str) -> String {
    format!("./dbfiles/{}.db", name)
}

async fn load_table(name: &str) -> Result<Table, String> {
    let content = fs::read_to_string(table_path(name)).await.map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            format!("Table '{}' does not exist.", name)
        } else {
            e.to_string()
        }
    })?;
    let mut lines = content.lines();
    let columns: Vec<String> = match lines.next() {
        Some(header) => header.split('\t').map(|s| s.to_string()).collect(),
        None => return Err(format!("Table '{}' is corrupted.", name)),
    };
    let rows = lines
        .map(|line| line.split('\t').map(|s| s.to_string()).collect())
        .collect();
    Ok(Table { columns, rows })
}

async fn save_table(name: &str, table: &Table) -> Result<(), String> {
    let mut data = table.columns.join("\t") + "\n";
    for row in &table.rows {
        data += &row.join("\t");
        data += "\n";
    }
    fs::write(table_path(name), data)
        .await
        .map_err(|e| e.to_string())
}

fn column_index(table: &Table, col: &str) -> Result<usize, String> {
    table
        .columns
        .iter()
        .position(|c| c == col)
        .ok_or(format!("Unknown column '{}'.", col))
}

fn is_valid_table_name(name: &str) -> bool {
    !name.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn tokenize(input: &str) -> Result<Vec<String>, String> {
    let mut tokens = Vec::new();
    let mut cur = String::new();
    let mut chars = input.chars();

    while let Some(c) = chars.next() {
        match c {
            '\'' | '"' => {
                if !cur.is_empty() {
                    tokens.push(std::mem::take(&mut cur));
                }
                let mut s = String::new();
                loop {
                    match chars.next() {
                        Some(ch) if ch == c => break,
                        Some('\t') | Some('\n') => {
                            return Err("Tabs/newlines not allowed in values.".to_string());
                        }
                        Some(ch) => s.push(ch),
                        None => return Err("Unclosed quote.".to_string()),
                    }
                }
                tokens.push(s);
            }
            '(' | ')' | ',' | '=' | '*' => {
                if !cur.is_empty() {
                    tokens.push(std::mem::take(&mut cur));
                }
                tokens.push(c.to_string());
            }
            c if c.is_whitespace() => {
                if !cur.is_empty() {
                    tokens.push(std::mem::take(&mut cur));
                }
            }
            _ => cur.push(c),
        }
    }
    if !cur.is_empty() {
        tokens.push(cur);
    }
    Ok(tokens)
}

struct Parser {
    tokens: Vec<String>,
    pos: usize,
}

impl Parser {
    fn next(&mut self) -> Result<String, String> {
        let t = self
            .tokens
            .get(self.pos)
            .cloned()
            .ok_or("Unexpected end of query.")?;
        self.pos += 1;
        Ok(t)
    }

    fn peek_is(&self, word: &str) -> bool {
        self.tokens
            .get(self.pos)
            .map_or(false, |t| t.eq_ignore_ascii_case(word))
    }

    fn expect(&mut self, word: &str) -> Result<(), String> {
        let t = self.next()?;
        if t.eq_ignore_ascii_case(word) {
            Ok(())
        } else {
            Err(format!("Expected '{}', found '{}'.", word, t))
        }
    }

    fn end(&self) -> Result<(), String> {
        match self.tokens.get(self.pos) {
            None => Ok(()),
            Some(t) => Err(format!("Unexpected '{}'.", t)),
        }
    }

    fn table_name(&mut self) -> Result<String, String> {
        let name = self.next()?;
        if is_valid_table_name(&name) {
            Ok(name)
        } else {
            Err("Invalid table name.".to_string())
        }
    }

    fn list(&mut self) -> Result<Vec<String>, String> {
        self.expect("(")?;
        let mut items = Vec::new();
        loop {
            items.push(self.next()?);
            match self.next()?.as_str() {
                "," => continue,
                ")" => break,
                other => return Err(format!("Expected ',' or ')', found '{}'.", other)),
            }
        }
        Ok(items)
    }

    fn where_clause(&mut self) -> Result<Option<(String, String)>, String> {
        if self.pos >= self.tokens.len() {
            return Ok(None);
        }
        self.expect("WHERE")?;
        let col = self.next()?;
        self.expect("=")?;
        let val = self.next()?;
        self.end()?;
        Ok(Some((col, val)))
    }
}

fn row_matches(row: &[String], cond: &Option<(usize, String)>) -> bool {
    match cond {
        None => true,
        Some((idx, val)) => row.get(*idx) == Some(val),
    }
}

fn resolve_where(
    table: &Table,
    w: Option<(String, String)>,
) -> Result<Option<(usize, String)>, String> {
    match w {
        None => Ok(None),
        Some((col, val)) => Ok(Some((column_index(table, &col)?, val))),
    }
}


pub async fn parse(input: &str) -> Result<Query, String> {
    let parts: Vec<&str> = input.split_whitespace().collect();

    if parts.is_empty() {
        return Err("Empty Query".to_string());
    }

    match parts[0].to_uppercase().as_str() {
        "CREATE" => {
            let mut p = Parser {
                tokens: tokenize(input)?,
                pos: 1,
            };
            p.expect("TABLE")?;
            let table_name = p.table_name()?;
            let columns = p.list()?;
            p.end()?;

            for (i, c) in columns.iter().enumerate() {
                if !is_valid_table_name(c) {
                    return Err(format!("Invalid column name '{}'.", c));
                }
                if columns[..i].contains(c) {
                    return Err(format!("Duplicate column '{}'.", c));
                }
            }

            fs::create_dir_all("./dbfiles")
                .await
                .map_err(|e| e.to_string())?;

            OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(table_path(&table_name))
                .await
                .map_err(|e| {
                    if e.kind() == std::io::ErrorKind::AlreadyExists {
                        format!("Table '{}' already exists.", table_name)
                    } else {
                        e.to_string()
                    }
                })?;

            save_table(
                &table_name,
                &Table {
                    columns,
                    rows: Vec::new(),
                },
            )
            .await?;

            Ok(Query::CreateTable { key: table_name })
        }

        "DROP" => {
            if parts.len() != 3 || !parts[1].eq_ignore_ascii_case("TABLE") {
                return Err("Usage: DROP TABLE <table_name>".to_string());
            }
            let table_name = parts[2];
            if !is_valid_table_name(table_name) {
                return Err("Invalid table name.".to_string());
            }
            fs::remove_file(table_path(table_name)).await.map_err(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    format!("Table '{}' does not exist.", table_name)
                } else {
                    e.to_string()
                }
            })?;

            Ok(Query::DeleteTable {
                key: table_name.to_string(),
            })
        }

        "INSERT" => {
            let mut p = Parser {
                tokens: tokenize(input)?,
                pos: 1,
            };
            p.expect("INTO")?;
            let name = p.table_name()?;
            let cols = if p.peek_is("(") {
                Some(p.list()?)
            } else {
                None
            };
            p.expect("VALUES")?;
            let values = p.list()?;
            p.end()?;

            let mut table = load_table(&name).await?;

            let row = match cols {
                None => {
                    if values.len() != table.columns.len() {
                        return Err(format!(
                            "Expected {} values, got {}.",
                            table.columns.len(),
                            values.len()
                        ));
                    }
                    values
                }
                Some(cols) => {
                    if cols.len() != values.len() {
                        return Err("Column count doesn't match value count.".to_string());
                    }
                    let mut row = vec![String::new(); table.columns.len()];
                    for (c, v) in cols.iter().zip(values) {
                        row[column_index(&table, c)?] = v;
                    }
                    row
                }
            };

            table.rows.push(row);
            save_table(&name, &table).await?;

            Ok(Query::Insert { table: name })
        }

        "SELECT" => {
            let mut p = Parser {
                tokens: tokenize(input)?,
                pos: 1,
            };

            let mut wanted = Vec::new();
            if p.peek_is("*") {
                p.next()?;
            } else {
                loop {
                    wanted.push(p.next()?);
                    if p.peek_is(",") {
                        p.next()?;
                    } else {
                        break;
                    }
                }
            }
            p.expect("FROM")?;
            let name = p.table_name()?;
            let w = p.where_clause()?;

            let table = load_table(&name).await?;
            let cond = resolve_where(&table, w)?;

            let indexes: Vec<usize> = if wanted.is_empty() {
                (0..table.columns.len()).collect()
            } else {
                wanted
                    .iter()
                    .map(|c| column_index(&table, c))
                    .collect::<Result<_, _>>()?
            };

            let columns = indexes.iter().map(|&i| table.columns[i].clone()).collect();
            let rows = table
                .rows
                .iter()
                .filter(|r| row_matches(r, &cond))
                .map(|r| {
                    indexes
                        .iter()
                        .map(|&i| r.get(i).cloned().unwrap_or_default())
                        .collect()
                })
                .collect();

            Ok(Query::Select { columns, rows })
        }

        // UPDATE users SET name = 'Rahul Kumar', age = 21 WHERE id = 2
        "UPDATE" => {
            let mut p = Parser {
                tokens: tokenize(input)?,
                pos: 1,
            };
            let name = p.table_name()?;
            p.expect("SET")?;

            let mut sets = Vec::new();
            loop {
                let col = p.next()?;
                p.expect("=")?;
                let val = p.next()?;
                sets.push((col, val));
                if p.peek_is(",") {
                    p.next()?;
                } else {
                    break;
                }
            }
            let w = p.where_clause()?;

            let mut table = load_table(&name).await?;
            let cond = resolve_where(&table, w)?;
            let sets: Vec<(usize, String)> = sets
                .into_iter()
                .map(|(c, v)| Ok((column_index(&table, &c)?, v)))
                .collect::<Result<_, String>>()?;

            let mut count = 0;
            for row in table.rows.iter_mut() {
                if row_matches(row, &cond) {
                    for (i, v) in &sets {
                        row[*i] = v.clone();
                    }
                    count += 1;
                }
            }
            save_table(&name, &table).await?;

            Ok(Query::Update { table: name, count })
        }

        // DELETE FROM users WHERE id = 1
        "DELETE" if parts.len() > 1 && parts[1].eq_ignore_ascii_case("FROM") => {
            let mut p = Parser {
                tokens: tokenize(input)?,
                pos: 2,
            };
            let name = p.table_name()?;
            let w = p.where_clause()?;

            let mut table = load_table(&name).await?;
            let cond = resolve_where(&table, w)?;

            let before = table.rows.len();
            table.rows.retain(|r| !row_matches(r, &cond));
            let count = before - table.rows.len();
            save_table(&name, &table).await?;

            Ok(Query::DeleteRows { table: name, count })
        }

        "SET" => {
            if parts.len() < 3 {
                return Err("Usage: SET <key> <value>".to_string());
            }

            Ok(Query::Set {
                key: parts[1].to_string(),
                value: parts[2..].join(" "),
            })
        }

        "GET" => {
            if parts.len() != 2 {
                return Err("Usage: GET <key>".to_string());
            }

            Ok(Query::Get {
                key: parts[1].to_string(),
            })
        }

        "DELETE" => {
            if parts.len() != 2 {
                return Err("Usage: DELETE <key>".to_string());
            }

            Ok(Query::Remove {
                key: parts[1].to_string(),
            })
        }

        _ => Err("Not a Valid Input.\nTry:\n\
CREATE TABLE <name> (col1, col2, ...)\n\
DROP TABLE <name>\n\
INSERT INTO <name> VALUES (v1, v2, ...)\n\
INSERT INTO <name> (col1, col2) VALUES (v1, v2)\n\
SELECT * FROM <name> [WHERE col = value]\n\
SELECT col1, col2 FROM <name> [WHERE col = value]\n\
UPDATE <name> SET col = value, ... [WHERE col = value]\n\
DELETE FROM <name> [WHERE col = value]\n\
SET <key> <value>\nGET <key>\nDELETE <key>"
            .to_string()),
    }
}
