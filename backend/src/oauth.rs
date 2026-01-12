use actix_web::{web, HttpResponse};
use crate::models::*;
use uuid::Uuid;
use jsonwebtoken::{encode, Header, EncodingKey};
use crate::auth::Claims;

pub async fn authorize(query: web::Query<OAuthAuthorizeRequest>) -> HttpResponse {
    // Validate request
    if query.client_id.is_empty() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "invalid_request".to_string(),
            message: "client_id is required".to_string(),
        });
    }

    if query.response_type != "code" {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "unsupported_response_type".to_string(),
            message: "Only 'code' response type is supported".to_string(),
        });
    }

    // Generate authorization code (should be stored and expire)
    let authorization_code = Uuid::new_v4().to_string();

    // In production: save the authorization code to database with expiration and redirect
    // For now, return the code in redirect
    let redirect_url = format!(
        "{}?code={}&state={}",
        query.redirect_uri,
        authorization_code,
        query.state.as_deref().unwrap_or(""),
    );

    HttpResponse::Found()
        .insert_header(("Location", redirect_url))
        .finish()
}

pub async fn token(body: web::Json<OAuthTokenRequest>) -> HttpResponse {
    // Validate request
    if body.grant_type != "authorization_code" {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "unsupported_grant_type".to_string(),
            message: "Only 'authorization_code' grant type is supported".to_string(),
        });
    }

    // TODO: Verify authorization code from database
    // TODO: Verify client credentials
    // TODO: Create or fetch user from database

    let user_id = Uuid::new_v4().to_string();
    
    // Create JWT token
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.clone(),
        exp: expiration,
    };

    let access_token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).unwrap_or_default();

    // Mock user data - in production this would come from database
    let user = User {
        id: user_id.clone(),
        username: "john_doe".to_string(),
        email: "john@example.com".to_string(),
        account_number: "1234567890".to_string(),
        balance: 5000.50,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    HttpResponse::Ok().json(OAuthTokenResponse {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: 86400, // 24 hours
        user,
    })
}

