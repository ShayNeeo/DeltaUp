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

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://fintech.db".to_string());
    let domain = env::var("DOMAIN").unwrap_or_else(|_| "localhost".to_string());
    
    println!("🚀 Starting DeltaUp API Server");
    println!("📊 Database: {}", database_url);
    println!("🌐 Domain: {}", domain);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            
            // OAuth endpoints
            .route("/oauth/authorize", web::get().to(oauth::authorize))
            .route("/oauth/token", web::post().to(oauth::token))
            
            // API endpoints
            .route("/api/transfer", web::post().to(handlers::transfer))
            .route("/api/balance", web::get().to(handlers::get_balance))
            .route("/api/qr-payment", web::post().to(handlers::qr_payment))
            .route("/api/health", web::get().to(handlers::health))
    })
    .bind("127.0.0.1:8000")?
    .run()
    .await
}

