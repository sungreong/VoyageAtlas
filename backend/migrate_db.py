import sqlite3
import os

def migrate():
    db_path = './voyage.db'
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found. Skipping manual migration.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    columns_to_add = [
        ("captured_at", "DATETIME"),
        ("lat", "FLOAT"),
        ("lng", "FLOAT"),
        ("city", "VARCHAR"),
        ("country", "VARCHAR")
    ]

    for col_name, col_type in columns_to_add:
        try:
            print(f"Adding column {col_name} to eventmedia table...")
            cursor.execute(f"ALTER TABLE eventmedia ADD COLUMN {col_name} {col_type}")
            print(f"Column {col_name} added successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists.")
            else:
                print(f"Error adding column {col_name}: {e}")

    trip_columns = [
        ("note", "TEXT"),
        ("cost", "FLOAT")
    ]
    
    for col_name, col_type in trip_columns:
        try:
            print(f"Adding column {col_name} to trip table...")
            cursor.execute(f"ALTER TABLE trip ADD COLUMN {col_name} {col_type}")
            print(f"Column {col_name} added successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists.")
            else:
                print(f"Error adding column {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
