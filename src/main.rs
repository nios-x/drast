use axum::{routing::get,routing::post, Router};
mod helpers;
mod handlers;
mod parser;
mod executor;
mod engine;
mod cors;
mod playground;

const DEFAULT_ADDR: &str = "127.0.0.1:3495";

#[tokio::main]
async fn main(){
    helpers::start();
    let addr = std::env::var("DRAST_ADDR").unwrap_or_else(|_| DEFAULT_ADDR.to_string());
    let app = Router::new()
    .route("/", get(handlers::root))
    .route("/query", post(executor::query))
    .merge(playground::router())
    .layer(cors::layer())
    .with_state(engine::Engine::new());
    let listner = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listner, app).await.unwrap();
}

