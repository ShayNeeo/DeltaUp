use actix_web::{web, HttpResponse, HttpRequest};
use serde_json::json;
use crate::models::*;
use uuid::Uuid;
use chrono::Utc;
use sqlx::PgPool;
use jsonwebtoken::{decode, Validation, DecodingKey};
use std::env;
use crate::auth::Claims;

pub async fn health() -> HttpResponse {
    HttpResponse::Ok().json(json!({
        "status": "ok",
        "message": "DeltaUp API is running"
    }))
}

async fn get_user_id_from_req(req: &HttpRequest) -> Option<Uuid> {
    let auth_header = req.headers().get("Authorization")?.to_str().ok()?;
    let token = auth_header.trim_start_matches("Bearer ");
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    
    let claims = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ).ok()?.claims;

    Uuid::parse_str(&claims.sub).ok()
}

pub async fn transfer(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Json<TransferRequest>,
) -> HttpResponse {
    let sender_id = match get_user_id_from_req(&req).await {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().finish(),
    };

    if body.amount <= 0.0 {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "invalid_amount".to_string(),
            message: "Amount must be greater than 0".to_string(),
        });
    }

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    // Get sender account and balance
    let sender = match sqlx::query_as::<_, SenderBalanceRow>(
        "SELECT account_number, balance FROM users WHERE id = $1 FOR UPDATE"
    )
    .bind(sender_id)
    .fetch_one(&mut *tx)
    .await {
        Ok(s) => s,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    let sender_balance: f64 = sender.balance.to_string().parse().unwrap_or(0.0);
    if sender_balance < body.amount {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "insufficient_funds".to_string(),
            message: "Insufficient funds for transfer".to_string(),
        });
    }

    // Get recipient
    let recipient = match sqlx::query_as::<_, RecipientRow>(
        "SELECT id, balance FROM users WHERE account_number = $1 FOR UPDATE"
    )
    .bind(&body.recipient_account)
    .fetch_optional(&mut *tx)
    .await {
        Ok(Some(r)) => r,
        Ok(None) => return HttpResponse::BadRequest().json(ErrorResponse {
            error: "recipient_not_found".to_string(),
            message: "Recipient account not found".to_string(),
        }),
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    // Update balances
    let amount_decimal = rust_decimal::Decimal::from_f64_retain(body.amount).unwrap();
    
    if let Err(_) = sqlx::query("UPDATE users SET balance = balance - $1 WHERE id = $2")
        .bind(amount_decimal)
        .bind(sender_id)
        .execute(&mut *tx).await {
        return HttpResponse::InternalServerError().finish();
    }

    if let Err(_) = sqlx::query("UPDATE users SET balance = balance + $1 WHERE id = $2")
        .bind(amount_decimal)
        .bind(recipient.id)
        .execute(&mut *tx).await {
        return HttpResponse::InternalServerError().finish();
    }

    // Record transaction
    let transaction_id = Uuid::new_v4();
    if let Err(_) = sqlx::query(
        "INSERT INTO transactions (id, from_account, to_account, amount, description, status) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(transaction_id)
    .bind(&sender.account_number)
    .bind(&body.recipient_account)
    .bind(amount_decimal)
    .bind(&body.description)
    .bind("completed")
    .execute(&mut *tx).await {
        return HttpResponse::InternalServerError().finish();
    }

    if let Err(_) = tx.commit().await {
        return HttpResponse::InternalServerError().finish();
    }

    HttpResponse::Ok().json(TransferResponse {
        transaction_id: transaction_id.to_string(),
        status: "completed".to_string(),
        amount: body.amount,
        timestamp: Utc::now().to_rfc3339(),
    })
}

#[derive(sqlx::FromRow)]
struct SenderBalanceRow {
    account_number: String,
    balance: rust_decimal::Decimal,
}

#[derive(sqlx::FromRow)]
struct RecipientRow {
    id: Uuid,
    balance: rust_decimal::Decimal,
}

pub async fn get_balance(
    pool: web::Data<PgPool>,
    req: HttpRequest
) -> HttpResponse {
    let user_id = match get_user_id_from_req(&req).await {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().finish(),
    };

    let user = match sqlx::query_as::<_, SenderBalanceRow>(
        "SELECT account_number, balance FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_one(pool.get_ref()).await {
        Ok(u) => u,
        Err(_) => return HttpResponse::NotFound().finish(),
    };

    HttpResponse::Ok().json(BalanceResponse {
        account_number: user.account_number,
        balance: user.balance.to_string().parse().unwrap_or(0.0),
        currency: "USD".to_string(),
    })
}

pub async fn qr_payment(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Json<QRPaymentRequest>,
) -> HttpResponse {
    let sender_id = match get_user_id_from_req(&req).await {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().finish(),
    };

    // Parse QR data (JSON expected)
    let qr_payment_data: serde_json::Value = match serde_json::from_str(&body.qr_data) {
        Ok(v) => v,
        Err(_) => return HttpResponse::BadRequest().json(ErrorResponse {
            error: "invalid_qr".to_string(),
            message: "Invalid QR code data".to_string(),
        }),
    };

    let recipient_account = match qr_payment_data["account"].as_str() {
        Some(s) => s.to_string(),
        None => return HttpResponse::BadRequest().json(ErrorResponse {
            error: "invalid_qr".to_string(),
            message: "Missing account in QR data".to_string(),
        }),
    };

    let amount = match qr_payment_data["amount"].as_f64() {
        Some(f) => f,
        None => return HttpResponse::BadRequest().json(ErrorResponse {
            error: "invalid_qr".to_string(),
            message: "Missing or invalid amount in QR data".to_string(),
        }),
    };

    if amount <= 0.0 {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "invalid_amount".to_string(),
            message: "Amount must be greater than 0".to_string(),
        });
    }

    let description = qr_payment_data["description"].as_str().map(|s| s.to_string());

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    // Get sender account and balance
    let sender = match sqlx::query_as::<_, SenderBalanceRow>(
        "SELECT account_number, balance FROM users WHERE id = $1 FOR UPDATE"
    )
    .bind(sender_id)
    .fetch_one(&mut *tx)
    .await {
        Ok(s) => s,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    let sender_balance: f64 = sender.balance.to_string().parse().unwrap_or(0.0);
    if sender_balance < amount {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "insufficient_funds".to_string(),
            message: "Insufficient funds for QR payment".to_string(),
        });
    }

    // Get recipient
    let recipient = match sqlx::query_as::<_, RecipientRow>(
        "SELECT id, balance FROM users WHERE account_number = $1 FOR UPDATE"
    )
    .bind(&recipient_account)
    .fetch_optional(&mut *tx)
    .await {
        Ok(Some(r)) => r,
        Ok(None) => return HttpResponse::NotFound().json(ErrorResponse {
            error: "recipient_not_found".to_string(),
            message: "Recipient account not found".to_string(),
        }),
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    // Update balances
    let new_sender_balance = sender_balance - amount;
    let recipient_balance: f64 = recipient.balance.to_string().parse().unwrap_or(0.0);
    let new_recipient_balance = recipient_balance + amount;

    if sqlx::query("UPDATE users SET balance = $1 WHERE id = $2")
        .bind(new_sender_balance)
        .bind(sender_id)
        .execute(&mut *tx)
        .await
        .is_err()
    {
        return HttpResponse::InternalServerError().finish();
    }

    if sqlx::query("UPDATE users SET balance = $1 WHERE id = $2")
        .bind(new_recipient_balance)
        .bind(recipient.id)
        .execute(&mut *tx)
        .await
        .is_err()
    {
        return HttpResponse::InternalServerError().finish();
    }

    // Record transaction
    let transaction_id = Uuid::new_v4();
    if sqlx::query(
        "INSERT INTO transactions (id, from_account, to_account, amount, description, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(transaction_id)
    .bind(&sender.account_number)
    .bind(&recipient_account)
    .bind(amount)
    .bind(&description)
    .bind("completed")
    .bind(Utc::now().naive_utc())
    .execute(&mut *tx)
    .await
    .is_err()
    {
        return HttpResponse::InternalServerError().finish();
    }

    // Commit transaction
    if tx.commit().await.is_err() {
        return HttpResponse::InternalServerError().finish();
    }

    HttpResponse::Ok().json(json!({
        "status": "completed",
        "message": "QR payment processed successfully",
        "transaction_id": transaction_id.to_string(),
        "from_account": sender.account_number,
        "to_account": recipient_account,
        "amount": amount,
        "new_balance": new_sender_balance,
        "timestamp": Utc::now().to_rfc3339()
    }))
}

pub async fn get_transactions(
    pool: web::Data<PgPool>,
    req: HttpRequest
) -> HttpResponse {
    let user_id = match get_user_id_from_req(&req).await {
        Some(id) => id,
        None => return HttpResponse::Unauthorized().finish(),
    };

    let user_account = match sqlx::query_as::<_, AccountNumberRow>(
        "SELECT account_number FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_one(pool.get_ref()).await {
        Ok(u) => u.account_number,
        Err(_) => return HttpResponse::NotFound().finish(),
    };

    let transactions = match sqlx::query_as::<_, TransactionRow>(
        "SELECT * FROM transactions WHERE from_account = $1 OR to_account = $1 ORDER BY created_at DESC LIMIT 50"
    )
    .bind(&user_account)
    .fetch_all(pool.get_ref()).await {
        Ok(rows) => rows.into_iter().map(|r| json!({
            "id": r.id.to_string(),
            "from_account": r.from_account,
            "to_account": r.to_account,
            "amount": r.amount.to_string().parse::<f64>().unwrap_or(0.0),
            "description": r.description,
            "status": r.status,
            "created_at": r.created_at.and_utc().to_rfc3339()
        })).collect::<Vec<_>>(),
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    HttpResponse::Ok().json(transactions)
}

#[derive(sqlx::FromRow)]
struct AccountNumberRow {
    account_number: String,
}

#[derive(sqlx::FromRow)]
struct TransactionRow {
    id: Uuid,
    from_account: String,
    to_account: String,
    amount: rust_decimal::Decimal,
    description: Option<String>,
    status: String,
    created_at: chrono::NaiveDateTime,
}

