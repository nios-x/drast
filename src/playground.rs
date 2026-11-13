use std::path::PathBuf;

use axum::{Router, http::StatusCode, response::Redirect, routing::get};
use tower_http::services::ServeDir;

/// Where the built playground is read from when `DRAST_PLAYGROUND_DIR` is not set.
/// Relative to the directory the server is started from, like `dbfiles/`.
const DEFAULT_DIR: &str = "frontend/dist";

/// Serves the DrastDB Playground (the React app in `frontend/`) at `/playground/`.
///
/// The files come from `DRAST_PLAYGROUND_DIR` (default `frontend/dist`). If that
/// folder has no `index.html`, `/playground/` explains how to build it instead.
pub fn router<S: Clone + Send + Sync + 'static>() -> Router<S> {
    let dir = PathBuf::from(
        std::env::var("DRAST_PLAYGROUND_DIR").unwrap_or_else(|_| DEFAULT_DIR.to_string()),
    );

    // The build uses relative asset URLs (`./assets/...`), so the page must be
    // loaded from `/playground/` with the trailing slash.
    let router = Router::new().route(
        "/playground",
        get(|| async { Redirect::permanent("/playground/") }),
    );

    if dir.join("index.html").is_file() {
        println!(
            "Playground: http://<server>/playground/ (from {})",
            dir.display()
        );
        router.nest_service("/playground/", ServeDir::new(dir))
    } else {
        println!(
            "Playground: not built ({} has no index.html), see /playground/",
            dir.display()
        );
        router
            .route("/playground/", get(not_built))
            .route("/playground/{*path}", get(not_built))
    }
}

async fn not_built() -> (StatusCode, &'static str) {
    (
        StatusCode::NOT_FOUND,
        "The DrastDB Playground has not been built.\n\n\
         Build it from the repository root with:\n\n  \
         cd frontend\n  \
         npm install\n  \
         npm run build\n\n\
         then restart the server from the repository root, or set DRAST_PLAYGROUND_DIR\n\
         to the folder that contains the built index.html.\n",
    )
}
