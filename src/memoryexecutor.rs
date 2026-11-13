use axum::{
    Json,
    extract::State,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

use crate::engine::Engine;
use crate::memoryparser;

pub async fn root() -> &'static str {
    "DrastDB is a Simple Mini DB made in Rust.\nAPI Server is Running..."
}

#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    query: String,
}

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    response: String,
}

pub async fn query(
    State(engine): State<Engine>,
    Json(body): Json<QueryRequest>,
) -> Result<Json<QueryResponse>, (StatusCode, String)> {

    let query = memoryparser::parse(&body.query)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))?;

    match engine.execute(query) {
        Ok(result) => {
            Ok(Json(QueryResponse {
                response: result,
            }))
        }

        Err(error) => {
            Err((StatusCode::BAD_REQUEST, error))
        }
    }
}