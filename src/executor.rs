use axum::{
    Json,
    extract::State,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

use crate::engine::Engine;
use crate::parser;

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

    let query = parser::parse(&body.query)
        .await
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