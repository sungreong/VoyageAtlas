from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from api.events import router as events_router
from api.importer import router as importer_router
from database import create_db_and_tables
from init_storage import init_minio
from migrate_db import migrate

app = FastAPI(title="VoyageAtlas API")

import sqlite3

def check_db_schema():
    db_path = './voyage.db'
    if not os.path.exists(db_path):
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Check if essential columns exist in trip table
        # If any essential new columns are missing, we reset for development convenience as requested.
        cursor.execute("SELECT cost, note FROM trip LIMIT 1")
    except sqlite3.OperationalError:
        print("ALERT: DB Schema mismatch (missing cost/note in trip). Resetting database...")
        conn.close()
        try:
            os.remove(db_path)
        except Exception as e:
            print(f"Failed to remove DB file: {e}")
        return
    conn.close()

@app.on_event("startup")
def on_startup():
    check_db_schema() # Boldly delete if sync is off
    migrate()
    create_db_and_tables()
    init_minio()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(importer_router)

@app.get("/")
async def root():
    return {"message": "Welcome to VoyageAtlas API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
