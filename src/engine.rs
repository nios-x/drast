use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::memoryparser::MemoryQuery; // change `parser` to whatever file holds MemoryQuery

#[derive(Clone, Default)]
pub struct Engine {
    store: Arc<RwLock<HashMap<String, String>>>,
}

impl Engine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn execute(&self, query: MemoryQuery) -> Result<String, String> {
        match query {
            MemoryQuery::Set { key, value } => {
                self.store.write().unwrap().insert(key, value);
                Ok("OK".into())
            }
            MemoryQuery::Get { key } => self
                .store
                .read()
                .unwrap()
                .get(&key)
                .cloned()
                .ok_or_else(|| format!("Key '{key}' not found")),
            MemoryQuery::Remove { key } => match self.store.write().unwrap().remove(&key) {
                Some(_) => Ok("DELETED".into()),
                None => Err(format!("Key '{key}' not found")),
            },
        }
    }
}