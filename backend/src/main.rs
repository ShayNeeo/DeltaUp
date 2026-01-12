mod models;
mod handlers;
mod db;
mod auth;
mod oauth;

use actix_web::{web, App, HttpServer, middleware::Logger};
use actix_cors::Cors;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let domain = env::var("DOMAIN").unwrap_or_else(|_| "localhost".to_string());
    let allowed_origins = env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,https://localhost:3000".to_string());
    
    println!("🚀 Starting DeltaUp API Server");
    println!("🌐 Domain: {}", domain);
    println!("🔒 CORS Origins: {}", allowed_origins);

    // Initialize database
    let pool = db::init_db(&database_url).await.expect("Failed to initialize database");
    println!("📊 Database connected successfully");

    // Parse allowed origins
    let origins: Vec<String> = allowed_origins
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    HttpServer::new(move || {
        let mut cors = Cors::default()
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .max_age(3600);

        // Add each allowed origin
        for origin in &origins {
            cors = cors.allowed_origin(origin);
        }

        App::new()
            .app_data(web::Data::new(pool.clone()))
            .wrap(Logger::default())
            .wrap(cors)
            
            // Authentication endpoints
            .route("/api/auth/register", web::post().to(auth::register))
            .route("/api/auth/login", web::post().to(auth::login))
            .route("/api/user/profile", web::get().to(auth::get_profile))
            
            // OAuth endpoints
            .route("/oauth/authorize", web::get().to(oauth::authorize))
            .route("/oauth/token", web::post().to(oauth::token))
            
            // API endpoints
            .route("/api/transfer", web::post().to(handlers::transfer))
            .route("/api/balance", web::get().to(handlers::get_balance))
            .route("/api/qr-payment", web::post().to(handlers::qr_payment))
            .route("/api/transactions", web::get().to(handlers::get_transactions))
            .route("/api/health", web::get().to(handlers::health))
    })
    .bind("0.0.0.0:8000")?
    .run()
    .await
}

