use std::collections::HashMap;

pub struct MemoryStore{
    data: HashMap<String, String>
}

impl MemoryStore{
    pub fn new() -> Self  {
        Self {
            data: HashMap::new()
        }
    }
    pub fn set(&mut self, key: String, value: String){
        self.data.insert(key, value);
    }
    pub fn get(&mut self, key: String) -> Option<&String>{
        self.data.get(&key)
    }

    pub fn delete(&mut self, key: &str) -> bool{
        self.data.remove(key).is_some()
    }
}