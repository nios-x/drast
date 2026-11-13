use axum::{routing::get,routing::post, Router};
mod helpers;
mod handlers;
mod memory;
mod memoryparser;
mod memoryexecutor;
mod engine;
const ADDR: &str = "127.0.0.1:3495";

#[tokio::main]
async fn main(){
    helpers::start();
    let app = Router::new()
    .route("/", get(handlers::root))
    .route("/memory", post(memoryexecutor::query))
    // .route("/query", post(memoryexecutor::query))
    .with_state(engine::Engine::new());
    let listner = tokio::net::TcpListener::bind(&ADDR).await.unwrap();
    axum::serve(listner, app).await.unwrap();
}

