#[derive(Debug)]
pub enum MemoryQuery{
    Set {
        key: String,
        value: String
    },    
    Get {
        key: String
    },
    Remove {
        key: String
    }
}

pub fn parse(input: &str) -> Result<MemoryQuery,String> {
    let parts: Vec<&str> = input.split_whitespace().collect();
    if parts.is_empty(){
        return Err("Empty Query".to_string());
    }
    match parts[0].to_uppercase().as_str() {
        "SET" => {
            if parts.len() < 3 {
                return Err("Usage: SET <key> <value>".to_string());
            }
            Ok(MemoryQuery::Set {
                key: parts[1].to_string(),
                value: parts[2..].join(" "),
            })
        }
        "GET" => {
            if parts.len() != 2 {
                return Err("Usage: GET <key>".to_string());
            }
            Ok(MemoryQuery::Get {
                key: parts[1].to_string(),
            })
        }
        "DELETE" => {
            if parts.len() != 2 {
                return Err("Usage: DELETE <key>".to_string());
            }
            Ok(MemoryQuery::Remove {
                key: parts[1].to_string(),
            })
        }
        _ => {
            Err("Not a Valid Input. \nTry SET <key> <value>\nGET <key>\nDELETE <key>".to_string())
        }

    }
} 