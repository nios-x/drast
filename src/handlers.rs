use axum::{Json, http::{HeaderMap, StatusCode}};
use serde::{Deserialize, Serialize};


pub async fn root(_headers: HeaderMap) -> String {
    "DrastDB is a Simple Mini DB made in Rust.\nAPI Server is Running...".to_string()
}

#[derive(Debug)]
#[derive(Deserialize)]  
pub struct QueryRequest{
    query: String
}

#[derive(Serialize)]
pub struct QueryResponse{
    response: String
}

pub async fn query(_: HeaderMap, Json(body): Json<QueryRequest>,) -> (StatusCode, Json<QueryResponse>) {
    println!("{:#?}", body);
    let ress = QueryResponse{ response : "Successfully executed".to_string()};
    (StatusCode::CREATED,Json(ress))
}


pub async fn memory(_: HeaderMap, Json(body): Json<QueryRequest>,) -> (StatusCode, Json<QueryResponse>) {
    println!("{:#?}", body);
    let ress = QueryResponse{ response : "Successfully executed".to_string()};
    (StatusCode::CREATED,Json(ress))
}
