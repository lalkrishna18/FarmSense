import sqlite3
from pathlib import Path
from datetime import datetime


# Store the database in the backend directory
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "farmsense.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database(market_data):
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS crop_prices (
            crop TEXT PRIMARY KEY,
            base_price REAL NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    now = datetime.now().isoformat(timespec="seconds")

    for crop, data in market_data.items():
        connection.execute("""
            INSERT OR IGNORE INTO crop_prices
            (crop, base_price, updated_at)
            VALUES (?, ?, ?)
        """, (
            crop,
            data["price"],
            now
        ))

    connection.commit()
    connection.close()


def get_all_prices():
    connection = get_connection()

    rows = connection.execute("""
        SELECT crop, base_price, updated_at
        FROM crop_prices
        ORDER BY crop
    """).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def get_price(crop):
    connection = get_connection()

    row = connection.execute("""
        SELECT crop, base_price, updated_at
        FROM crop_prices
        WHERE crop = ?
    """, (crop,)).fetchone()

    connection.close()

    return dict(row) if row else None


def update_price(crop, base_price):
    connection = get_connection()

    updated_at = datetime.now().isoformat(timespec="seconds")

    cursor = connection.execute("""
        UPDATE crop_prices
        SET base_price = ?, updated_at = ?
        WHERE crop = ?
    """, (
        base_price,
        updated_at,
        crop
    ))

    connection.commit()
    connection.close()

    return cursor.rowcount > 0