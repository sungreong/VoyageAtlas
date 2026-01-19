from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from api.events import router as events_router
from api.importer import router as importer_router
from database import create_db_and_tables
from init_storage import init_minio

app = FastAPI(title="VoyageAtlas API")

@app.on_event("startup")
def on_startup():
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
