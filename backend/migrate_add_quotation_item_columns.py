"""
Small migration script to add `part_no` and `part_name` columns to `quotation_items` table
if they don't exist. Run once after updating models:

PowerShell:
  .\venv\Scripts\Activate.ps1
  python migrate_add_quotation_item_columns.py

This is non-destructive and only adds missing columns.
"""
import sqlite3
import os


def column_exists(cur, table, column):
    cur.execute(f"PRAGMA table_info('{table}')")
    cols = [r[1] for r in cur.fetchall()]
    return column in cols


def migrate(db_path):
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        changed = False
        if not column_exists(cur, 'quotation_items', 'part_no'):
            print('Adding column part_no to quotation_items')
            cur.execute("ALTER TABLE quotation_items ADD COLUMN part_no TEXT")
            changed = True
        else:
            print('Column part_no already exists')

        if not column_exists(cur, 'quotation_items', 'part_name'):
            print('Adding column part_name to quotation_items')
            cur.execute("ALTER TABLE quotation_items ADD COLUMN part_name TEXT")
            changed = True
        else:
            print('Column part_name already exists')

        if changed:
            conn.commit()
            print('Migration complete.')
        else:
            print('No changes required.')
    except Exception as e:
        print('Migration failed:', e)
        conn.rollback()
    finally:
        conn.close()


if __name__ == '__main__':
    # prefer Config.DATABASE if available
    db = os.path.join(os.path.dirname(__file__), 'quotation.db')
    try:
        from config import Config as Cfg
        db = Cfg.DATABASE
    except Exception:
        pass

    migrate(db)
