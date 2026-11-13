use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::parser::Query;

#[derive(Clone, Default)]
pub struct Engine {
    store: Arc<RwLock<HashMap<String, String>>>,
}

impl Engine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn execute(&self, query: Query) -> Result<String, String> {
        match query {
            // In-memory key/value commands
            Query::Set { key, value } => {
                self.store.write().unwrap().insert(key, value);
                Ok("OK".into())
            }
            Query::Get { key } => self
                .store
                .read()
                .unwrap()
                .get(&key)
                .cloned()
                .ok_or_else(|| format!("Key '{key}' not found")),
            Query::Remove { key } => match self.store.write().unwrap().remove(&key) {
                Some(_) => Ok("DELETED".into()),
                None => Err(format!("Key '{key}' not found")),
            },

            // Table commands: the parser has already done the disk work,
            // so here we only format the result.
            Query::CreateTable { key } => Ok(format!("Table '{key}' created.")),
            Query::DeleteTable { key } => Ok(format!("Table '{key}' dropped.")),
            Query::Insert { table } => Ok(format!("1 row inserted into '{table}'.")),
            Query::Update { table, count } => Ok(format!("{count} row(s) updated in '{table}'.")),
            Query::DeleteRows { table, count } => {
                Ok(format!("{count} row(s) deleted from '{table}'."))
            }
            Query::Select { columns, rows } => {
                let mut out = columns.join("\t");
                for row in &rows {
                    out.push('\n');
                    out.push_str(&row.join("\t"));
                }
                out.push_str(&format!("\n({} row(s))", rows.len()));
                Ok(out)
            }
            // Same tab-separated shape as SELECT so clients can parse both alike.
            Query::ShowTables { tables } => {
                let mut out = String::from("table\tcolumns\trows");
                for t in &tables {
                    out.push_str(&format!("\n{}\t{}\t{}", t.name, t.columns.join(", "), t.rows));
                }
                out.push_str(&format!("\n({} row(s))", tables.len()));
                Ok(out)
            }
        }
    }
}
