use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::ConnectOptions;
use std::str::FromStr;
use std::time::Duration;

pub async fn init_db(database_url: &str) -> Result<sqlx::SqlitePool, sqlx::Error> {
    let connect_options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(30))
        .connect_with(connect_options)
        .await?;

    // Run migrations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            account_number TEXT NOT NULL UNIQUE,
            balance REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            from_account TEXT NOT NULL,
            to_account TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS oauth_codes (
            code TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

