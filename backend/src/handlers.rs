use actix_web::{web, HttpResponse, HttpRequest};
use serde_json::json;
use crate::models::*;
use uuid::Uuid;
use chrono::Utc;

pub async fn health() -> HttpResponse {
    HttpResponse::Ok().json(json!({
        "status": "ok",
        "message": "DeltaUp API is running"
    }))
}

pub async fn transfer(
    _req: HttpRequest,
    body: web::Json<TransferRequest>,
) -> HttpResponse {
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

pub async fn get_balance(_req: HttpRequest) -> HttpResponse {
    // TODO: Fetch balance from database
    HttpResponse::Ok().json(BalanceResponse {
        account_number: "1234567890".to_string(),
        balance: 5000.50,
        currency: "USD".to_string(),
    })
}

pub async fn qr_payment(
    _req: HttpRequest,
    _body: web::Json<QRPaymentRequest>,
) -> HttpResponse {
    // TODO: Parse QR data
    // TODO: Process payment

    HttpResponse::Ok().json(json!({
        "status": "completed",
        "message": "QR payment processed successfully",
        "timestamp": Utc::now().to_rfc3339()
    }))
}

pub async fn get_transactions(_req: HttpRequest) -> HttpResponse {
    // TODO: Fetch transactions from database
    HttpResponse::Ok().json(json!([]))
}
