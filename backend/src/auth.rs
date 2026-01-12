use actix_web::{web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use std::env;
use sqlx::PgPool;

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

#[derive(Serialize, sqlx::FromRow)]
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

pub async fn register(
    pool: web::Data<PgPool>,
    req: web::Json<RegisterRequest>
) -> impl Responder {
    let user_id = Uuid::new_v4();
    let account_number = generate_account_number();
    
    let password_hash = match hash(&req.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to hash password"
        })),
    };

    // Store in database using query instead of query! to avoid compile-time DB requirement
    let result = sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, account_number, balance) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(user_id)
    .bind(&req.username)
    .bind(&req.email)
    .bind(password_hash)
    .bind(&account_number)
    .bind(rust_decimal::Decimal::from(1000))
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let token = match create_jwt(&user_id.to_string()) {
                Ok(t) => t,
                Err(_) => return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Failed to create token"
                })),
            };

            let user = UserResponse {
                id: user_id.to_string(),
                username: req.username.clone(),
                email: req.email.clone(),
                account_number,
                balance: 1000.0,
            };

            HttpResponse::Ok().json(AuthResponse { token, user })
        },
        Err(e) => HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Registration failed",
            "message": e.to_string()
        }))
    }
}

pub async fn login(
    pool: web::Data<PgPool>,
    req: web::Json<LoginRequest>
) -> impl Responder {
    let user_row = sqlx::query_as::<_, UserRow>(
        "SELECT id, username, email, password_hash, account_number, balance FROM users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_optional(pool.get_ref())
    .await;

    let user_row = match user_row {
        Ok(Some(row)) => row,
        Ok(None) => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Invalid email or password"
        })),
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    // Verify password
    if !verify(&req.password, &user_row.password_hash).unwrap_or(false) {
        return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Invalid email or password"
        }));
    }

    let user_id_str = user_row.id.to_string();
    let token = match create_jwt(&user_id_str) {
        Ok(t) => t,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    let user = UserResponse {
        id: user_id_str,
        username: user_row.username,
        email: user_row.email,
        account_number: user_row.account_number,
        balance: user_row.balance.to_string().parse().unwrap_or(0.0),
    };

    HttpResponse::Ok().json(AuthResponse { token, user })
}

#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    username: String,
    email: String,
    password_hash: String,
    account_number: String,
    balance: rust_decimal::Decimal,
}

pub async fn get_profile(
    pool: web::Data<PgPool>,
    req: HttpRequest
) -> impl Responder {
    let auth_header = match req.headers().get("Authorization") {
        Some(h) => h.to_str().unwrap_or(""),
        None => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "No authorization header"
        })),
    };

    let token = auth_header.trim_start_matches("Bearer ");
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    
    let claims = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(c) => c.claims,
        Err(_) => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Invalid token"
        })),
    };

    let user_uuid = match Uuid::parse_str(&claims.sub) {
        Ok(u) => u,
        Err(_) => return HttpResponse::Unauthorized().finish(),
    };

    let user_record = sqlx::query_as::<_, ProfileRow>(
        "SELECT id, username, email, account_number, balance FROM users WHERE id = $1"
    )
    .bind(user_uuid)
    .fetch_optional(pool.get_ref())
    .await;

    match user_record {
        Ok(Some(row)) => {
            let user = UserResponse {
                id: row.id.to_string(),
                username: row.username,
                email: row.email,
                account_number: row.account_number,
                balance: row.balance.to_string().parse().unwrap_or(0.0),
            };
            HttpResponse::Ok().json(user)
        },
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

#[derive(sqlx::FromRow)]
struct ProfileRow {
    id: Uuid,
    username: String,
    email: String,
    account_number: String,
    balance: rust_decimal::Decimal,
}

