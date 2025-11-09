use actix_web::{web, HttpResponse, HttpRequest};
use serde_json::json;
use crate::models::*;
use crate::auth::verify_token;
use uuid::Uuid;
use chrono::Utc;

pub async fn health() -> HttpResponse {
    HttpResponse::Ok().json(json!({
        "status": "ok",
        "message": "DeltaUp API is running"
    }))
}

pub async fn transfer(
    req: HttpRequest,
    body: web::Json<TransferRequest>,
) -> HttpResponse {
    // Verify JWT token
    match verify_token(&req) {
        Ok(user_id) => {
            let transaction_id = Uuid::new_v4().to_string();
            
            // Validation
            if body.amount <= 0.0 {
                return HttpResponse::BadRequest().json(ErrorResponse {
                    error: "invalid_amount".to_string(),
                    message: "Amount must be greater than 0".to_string(),
                });
            }

            if body.recipient_account.is_empty() {
                return HttpResponse::BadRequest().json(ErrorResponse {
                    error: "invalid_recipient".to_string(),
                    message: "Recipient account is required".to_string(),
                });
            }

            // TODO: Save transaction to database
            // TODO: Call OpenAPI to process transfer

            HttpResponse::Ok().json(TransferResponse {
                transaction_id,
                status: "completed".to_string(),
                amount: body.amount,
                timestamp: Utc::now().to_rfc3339(),
            })
        }
        Err(_) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Invalid or missing token".to_string(),
        }),
    }
}

pub async fn get_balance(req: HttpRequest) -> HttpResponse {
    match verify_token(&req) {
        Ok(_user_id) => {
            // TODO: Fetch balance from database
            HttpResponse::Ok().json(BalanceResponse {
                account_number: "1234567890".to_string(),
                balance: 5000.50,
                currency: "USD".to_string(),
            })
        }
        Err(_) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Invalid or missing token".to_string(),
        }),
    }
}

pub async fn qr_payment(
    req: HttpRequest,
    body: web::Json<QRPaymentRequest>,
) -> HttpResponse {
    match verify_token(&req) {
        Ok(_user_id) => {
            // TODO: Parse QR data
            // TODO: Process payment

            HttpResponse::Ok().json(json!({
                "status": "completed",
                "message": "QR payment processed successfully",
                "timestamp": Utc::now().to_rfc3339()
            }))
        }
        Err(_) => HttpResponse::Unauthorized().json(ErrorResponse {
            error: "unauthorized".to_string(),
            message: "Invalid or missing token".to_string(),
        }),
    }
}

