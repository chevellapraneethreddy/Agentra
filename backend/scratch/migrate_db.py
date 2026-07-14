import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "agentra.db")
print("Connecting to:", os.path.abspath(db_path))

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE businesses ADD COLUMN onboarding_completed BOOLEAN DEFAULT 0 NOT NULL;")
    print("Added column onboarding_completed to businesses table.")
except sqlite3.OperationalError as e:
    print("Column onboarding_completed already exists or error:", e)

conn.commit()
conn.close()
