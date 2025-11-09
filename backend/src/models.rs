use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub account_number: String,
    pub balance: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferRequest {
    pub recipient_account: String,
    pub amount: f64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferResponse {
    pub transaction_id: String,
    pub status: String,
    pub amount: f64,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceResponse {
    pub account_number: String,
    pub balance: f64,
    pub currency: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QRPaymentRequest {
    pub qr_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthAuthorizeRequest {
    pub client_id: String,
    pub redirect_uri: String,
    pub response_type: String,
    pub scope: Option<String>,
    pub state: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthTokenRequest {
    pub code: String,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub grant_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: User,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

