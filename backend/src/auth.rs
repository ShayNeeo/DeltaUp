use actix_web::{web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use bcrypt::{hash, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub account_number: String,
    pub balance: f64,
}

fn generate_account_number() -> String {
    let random_num: u64 = rand::random();
    format!("{:012}", random_num % 1_000_000_000_000)
}

fn create_jwt(user_id: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let expiration = Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub async fn register(req: web::Json<RegisterRequest>) -> impl Responder {
    let user_id = Uuid::new_v4().to_string();
    let account_number = generate_account_number();
    
    let _password_hash = match hash(&req.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to hash password"
        })),
    };

    let token = match create_jwt(&user_id) {
        Ok(t) => t,
        Err(_) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create token"
        })),
    };

    let user = UserResponse {
        id: user_id.clone(),
        username: req.username.clone(),
        email: req.email.clone(),
        account_number: account_number.clone(),
        balance: 0.0,
    };

    HttpResponse::Ok().json(AuthResponse { token, user })
}

pub async fn login(req: web::Json<LoginRequest>) -> impl Responder {
    // Mock user for demonstration - in production, query database
    let user_id = Uuid::new_v4().to_string();
    
    let token = match create_jwt(&user_id) {
        Ok(t) => t,
        Err(_) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create token"
        })),
    };

    let user = UserResponse {
        id: user_id.clone(),
        username: "demo_user".to_string(),
        email: req.email.clone(),
        account_number: "123456789012".to_string(),
        balance: 1000.0,
    };

    HttpResponse::Ok().json(AuthResponse { token, user })
}

pub async fn get_profile(req: HttpRequest) -> impl Responder {
    // Extract token from Authorization header
    let auth_header = match req.headers().get("Authorization") {
        Some(h) => h.to_str().unwrap_or(""),
        None => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "No authorization header"
        })),
    };

    let token = auth_header.trim_start_matches("Bearer ");
    
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    
    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(_) => {
            let user = UserResponse {
                id: Uuid::new_v4().to_string(),
                username: "demo_user".to_string(),
                email: "demo@example.com".to_string(),
                account_number: "123456789012".to_string(),
                balance: 1000.0,
            };
            HttpResponse::Ok().json(user)
        }
        Err(_) => HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Invalid token"
        })),
    }
}
