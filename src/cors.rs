use axum::http::{HeaderValue, Method, header};
use tower_http::cors::{AllowOrigin, CorsLayer};

/// CORS policy for browser clients such as the DrastDB Playground.
///
/// By default only pages served from this machine (`localhost`, `127.0.0.1`,
/// `[::1]`, any port) may call the API, so a random website you visit cannot
/// read or change your data. Extra origins can be allowed with
/// `DRAST_CORS_ORIGINS` (comma-separated, e.g. `https://my-app.vercel.app`),
/// or every origin with `DRAST_CORS_ORIGINS=*`.
pub fn layer() -> CorsLayer {
    let extra: Vec<String> = std::env::var("DRAST_CORS_ORIGINS")
        .map(|v| {
            v.split(',')
                .map(|s| s.trim().trim_end_matches('/').to_string())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default();

    let allow_origin = if extra.iter().any(|o| o == "*") {
        AllowOrigin::any()
    } else {
        AllowOrigin::predicate(move |origin: &HeaderValue, _| {
            let Ok(origin) = origin.to_str() else {
                return false;
            };
            is_local_origin(origin) || extra.iter().any(|o| o == origin)
        })
    };

    CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE])
}

fn is_local_origin(origin: &str) -> bool {
    let Some(rest) = origin
        .strip_prefix("http://")
        .or_else(|| origin.strip_prefix("https://"))
    else {
        return false;
    };
    if rest == "[::1]" || rest.starts_with("[::1]:") {
        return true;
    }
    let host = rest.split(':').next().unwrap_or("");
    host == "localhost" || host == "127.0.0.1"
}
