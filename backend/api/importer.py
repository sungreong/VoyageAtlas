from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io
from datetime import datetime
from sqlmodel import Session
from database import get_session
from models import TravelEvent, EventMedia, Trip
from sqlmodel import select, col
import json
from typing import List
from datetime import date
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/data", tags=["data"])

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

@router.get("/export/json")
async def export_json(
    start_date: date,
    end_date: date,
    session: Session = Depends(get_session)
):
    # Find trips that have events within the date range
    statement = (
        select(Trip)
        .join(TravelEvent)
        .where(TravelEvent.start_datetime >= datetime.combine(start_date, datetime.min.time()))
        .where(TravelEvent.start_datetime <= datetime.combine(end_date, datetime.max.time()))
        .distinct()
        .options(selectinload(Trip.events).selectinload(TravelEvent.media_list))
    )
    
    trips = session.exec(statement).all()
    
    export_data = {
        "version": "1.0",
        "exported_at": datetime.now().isoformat(),
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "trips": [
            {
                "title": trip.title,
                "description": trip.description,
                "created_at": trip.created_at.isoformat() if trip.created_at else None,
                "events": [
                    {
                        "start_datetime": event.start_datetime.isoformat(),
                        "from_name": event.from_name,
                        "to_name": event.to_name,
                        "from_lat": event.from_lat,
                        "from_lng": event.from_lng,
                        "to_lat": event.to_lat,
                        "to_lng": event.to_lng,
                        "transport": event.transport,
                        "title": event.title,
                        "note": event.note,
                        "media_list": [
                            {
                                "url": media.url,
                                "media_type": media.media_type
                            } for media in event.media_list
                        ]
                    } for event in trip.events
                ]
            } for trip in trips
        ]
    }
    
    return export_data

@router.post("/import/json")
async def import_json(file: UploadFile = File(...), session: Session = Depends(get_session)):
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JSON file.")
    
    contents = await file.read()
    try:
        data = json.loads(contents.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format.")
        
    version = data.get("version", "1.0")
    trips_data = data.get("trips", [])
    
    imported_count = 0
    
    for trip_data in trips_data:
        # Create new Trip
        new_trip = Trip(
            title=f"{trip_data['title']} (Imported)",
            description=trip_data.get('description'),
            created_at=datetime.fromisoformat(trip_data['created_at']) if trip_data.get('created_at') else datetime.utcnow()
        )
        session.add(new_trip)
        session.flush() # Generate ID
        
        for event_data in trip_data.get("events", []):
            new_event = TravelEvent(
                trip_id=new_trip.id,
                start_datetime=datetime.fromisoformat(event_data['start_datetime']),
                from_name=event_data['from_name'],
                to_name=event_data['to_name'],
                from_lat=event_data['from_lat'],
                from_lng=event_data['from_lng'],
                to_lat=event_data['to_lat'],
                to_lng=event_data['to_lng'],
                transport=event_data.get('transport', 'plane'),
                title=event_data['title'],
                note=event_data.get('note')
            )
            session.add(new_event)
            session.flush()
            
            for media_data in event_data.get("media_list", []):
                new_media = EventMedia(
                    event_id=new_event.id,
                    url=media_data['url'],
                    media_type=media_data.get('media_type', 'image')
                )
                session.add(new_media)
        
        imported_count += 1
        
    session.commit()
    
    return {"message": f"Successfully imported {imported_count} trips."}
