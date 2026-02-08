#!/usr/bin/env python
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'instance', 'teamwork.db')
print(f"Database path: {db_path}")

if not os.path.exists(db_path):
    print("ERROR: Database file not found!")
    exit(1)

conn = sqlite3.connect(db_path, timeout=30)
c = conn.cursor()

# Check current columns
c.execute("PRAGMA table_info(attachments)")
columns = [x[1] for x in c.fetchall()]
print(f"Current columns: {columns}")

if 'content' not in columns:
    print("Adding content column...")
    c.execute('ALTER TABLE attachments ADD COLUMN content TEXT')
    conn.commit()
    print("SUCCESS: Content column added!")
else:
    print("Content column already exists")

conn.close()
print("Done!")
