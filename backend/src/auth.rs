use actix_web::HttpRequest;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: i64,
}

pub fn verify_token(req: &HttpRequest) -> Result<String, String> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or("Missing Authorization header".to_string())?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or("Invalid Authorization header format".to_string())?;

    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your_secret_key".to_string());
    
    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => Ok(data.claims.sub),
        Err(_) => Err("Invalid token".to_string()),
    }
}

pub fn create_token(user_id: &str) -> String {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use chrono::Duration;
    
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your_secret_key".to_string());
    let expiration = chrono::Utc::now() + Duration::hours(24);
    
    let claims = Claims {
        sub: user_id.to_string(),
        exp: expiration.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).unwrap_or_default()
}

