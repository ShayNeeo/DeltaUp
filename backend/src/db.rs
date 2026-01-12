use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use std::str::FromStr;
use std::time::Duration;

#[allow(dead_code)]
pub async fn init_db(database_url: &str) -> Result<sqlx::PgPool, sqlx::Error> {
    let connect_options = PgConnectOptions::from_str(database_url)?;

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(30))
        .connect_with(connect_options)
        .await?;

    // Run migrations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            account_number VARCHAR(50) NOT NULL UNIQUE,
            balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY,
            from_account VARCHAR(50) NOT NULL,
            to_account VARCHAR(50) NOT NULL,
            amount DECIMAL(15, 2) NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS oauth_codes (
            code VARCHAR(255) PRIMARY KEY,
            user_id UUID NOT NULL,
            client_id VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_account_number ON users(account_number);
        CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account);
        CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account);
        CREATE INDEX IF NOT EXISTS idx_oauth_codes_user_id ON oauth_codes(user_id);
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}
