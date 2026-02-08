from app import app, db
import sqlite3
import json
import os

DB_PATH = 'instance/teamwork.db'

def migrate():
    print("Starting migration...")
    
    # ensure instance folder exists
    if not os.path.exists('instance'):
        os.makedirs('instance')

    with app.app_context():
        # 1. Create any missing tables (UnreadStatus)
        db.create_all()
        print("Database tables synchronized (created if missing).")
        
        # 2. Manual migration for adding columns to existing tables (SQLite restriction)
        # We need raw connection for ALTER TABLE
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                
                # Check projects table for 'columns'
                cursor.execute("PRAGMA table_info(projects)")
                cols = [info[1] for info in cursor.fetchall()]
                
                if 'columns' not in cols:
                    print("Adding 'columns' column to projects table...")
                    cursor.execute("ALTER TABLE projects ADD COLUMN columns TEXT")
                    
                    # Set default
                    default_cols = json.dumps(['待办', '进行中', '已完成'], ensure_ascii=False)
                    cursor.execute("UPDATE projects SET columns = ?", (default_cols,))
                    print("Added 'columns' field successfully.")
                else:
                    print("'columns' field already exists.")
                    
        except Exception as e:
            print(f"Migration error: {e}")

if __name__ == '__main__':
    migrate()
