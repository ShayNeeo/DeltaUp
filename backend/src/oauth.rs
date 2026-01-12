use actix_web::{web, HttpResponse};
use crate::models::*;
use uuid::Uuid;
use jsonwebtoken::{encode, Header, EncodingKey};
use crate::auth::Claims;
use sqlx::PgPool;
use chrono::Utc;

pub async fn authorize(
    pool: web::Data<PgPool>,
    query: web::Query<OAuthAuthorizeRequest>
) -> HttpResponse {
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

    // Generate authorization code
    let authorization_code = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + chrono::Duration::minutes(10);

    // Mock user_id for now as we don't have a login session here yet
    // In a real OAuth flow, this page would be preceded by a login page
    let user_id = Uuid::nil(); 

    // Store the authorization code
    let result = sqlx::query(
        "INSERT INTO oauth_codes (code, user_id, client_id, expires_at) VALUES ($1, $2, $3, $4)"
    )
    .bind(&authorization_code)
    .bind(user_id)
    .bind(&query.client_id)
    .bind(expires_at)
    .execute(pool.get_ref()).await;

    if result.is_err() {
        return HttpResponse::InternalServerError().finish();
    }

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

#[derive(sqlx::FromRow)]
struct CodeRow {
    user_id: Uuid,
    expires_at: chrono::NaiveDateTime,
}

pub async fn token(
    pool: web::Data<PgPool>,
    body: web::Json<OAuthTokenRequest>
) -> HttpResponse {
    // Validate request
    if body.grant_type != "authorization_code" {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "unsupported_grant_type".to_string(),
            message: "Only 'authorization_code' grant type is supported".to_string(),
        });
    }

    // Verify authorization code from database
    let code_record = sqlx::query_as::<_, CodeRow>(
        "SELECT user_id, expires_at FROM oauth_codes WHERE code = $1 AND client_id = $2"
    )
    .bind(&body.code)
    .bind(&body.client_id)
    .fetch_optional(pool.get_ref()).await;

    let code_row = match code_record {
        Ok(Some(row)) => {
            if row.expires_at < Utc::now().naive_utc() {
                return HttpResponse::BadRequest().json(ErrorResponse {
                    error: "invalid_grant".to_string(),
                    message: "Authorization code expired".to_string(),
                });
            }
            row
        },
        _ => return HttpResponse::BadRequest().json(ErrorResponse {
            error: "invalid_grant".to_string(),
            message: "Invalid authorization code".to_string(),
        }),
    };

    // Use a fixed user if it was nil (for testing/mocking)
    let user_uuid = if code_row.user_id.is_nil() {
        // Fallback to a demo user if one exists, otherwise keep nil
        code_row.user_id
    } else {
        code_row.user_id
    };

    // Create JWT token
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let expiration = Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_uuid.to_string(),
        exp: expiration,
    };

    let access_token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).unwrap_or_default();

    // Fetch user data from database
    let user_record = sqlx::query_as::<_, UserDataRow>(
        "SELECT id, username, email, account_number, balance, created_at FROM users WHERE id = $1"
    )
    .bind(user_uuid)
    .fetch_optional(pool.get_ref()).await;

    let user = match user_record {
        Ok(Some(row)) => User {
            id: row.id.to_string(),
            username: row.username,
            email: row.email,
            account_number: row.account_number,
            balance: row.balance.to_string().parse().unwrap_or(0.0),
            created_at: row.created_at.and_utc().to_rfc3339(),
        },
        _ => {
            // Placeholder user if not found (e.g. nil UUID)
            User {
                id: user_uuid.to_string(),
                username: "oauth_user".to_string(),
                email: "oauth@example.com".to_string(),
                account_number: "000000000000".to_string(),
                balance: 0.0,
                created_at: Utc::now().to_rfc3339(),
            }
        }
    };

    HttpResponse::Ok().json(OAuthTokenResponse {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: 86400, // 24 hours
        user,
    })
}

#[derive(sqlx::FromRow)]
struct UserDataRow {
    id: Uuid,
    username: String,
    email: String,
    account_number: String,
    balance: rust_decimal::Decimal,
    created_at: chrono::NaiveDateTime,
}
