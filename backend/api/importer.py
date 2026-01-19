from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io
from datetime import datetime
from sqlmodel import Session
from database import get_session
from models import TravelEvent, EventMedia

router = APIRouter(prefix="/import", tags=["import"])

@router.post("/csv")
async def import_csv(file: UploadFile = File(...), trip_id: int = 1, session: Session = Depends(get_session)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")
    
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    
    results = []
    errors = []
    
    for index, row in df.iterrows():
        try:
            event = TravelEvent(
                trip_id=trip_id,
                start_datetime=pd.to_datetime(row['start_datetime']),
                from_name=row['from_name'],
                to_name=row['to_name'],
                from_lat=float(row['from_lat']),
                from_lng=float(row['from_lng']),
                to_lat=float(row['to_lat']),
                to_lng=float(row['to_lng']),
                title=row['title'],
                note=row.get('note')
            )
            session.add(event)
            session.flush() # Get event ID
            
            # Add media if exists in CSV
            media_url = row.get('media_url')
            if media_url and pd.notna(media_url):
                media = EventMedia(
                    event_id=event.id,
                    url=str(media_url),
                    media_type="pano_image" if "sphere" in str(media_url).lower() else "image"
                )
                session.add(media)
                
            results.append(row['title'])
        except Exception as e:
            errors.append(f"Row {index}: {str(e)}")
            
    session.commit()
    
    return {
        "imported": len(results),
        "failed": len(errors),
        "errors": errors
    }
