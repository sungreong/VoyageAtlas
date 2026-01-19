from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from models import TravelEvent, Trip, EventMedia
import boto3
import os
from database import get_session
from utils.geocoder import geocode_city
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import urllib.parse
import json

router = APIRouter(prefix="/events", tags=["events"])

class ItineraryLeg(BaseModel):
    city_name: str
    arrival_date: datetime

class EventMediaRead(BaseModel):
    id: int
    url: str
    media_type: str
    event_id: int
    model_config = ConfigDict(from_attributes=True)

class TravelEventRead(BaseModel):
    id: int
    trip_id: int
    start_datetime: datetime
    from_name: str
    to_name: str
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    transport: str
    title: str
    note: Optional[str] = None
    media_list: List[EventMediaRead] = []
    model_config = ConfigDict(from_attributes=True)

class SimpleTripRequest(BaseModel):
    title: str
    start_city: str
    start_date: datetime
    legs: List[ItineraryLeg]

@router.get("/", response_model=List[TravelEventRead])
def read_events(session: Session = Depends(get_session)):
    events = session.exec(select(TravelEvent).options(selectinload(TravelEvent.media_list)).order_by(TravelEvent.start_datetime)).all()
    print(f"DEBUG: read_events found {len(events)} events")
    for e in events:
        print(f"DEBUG: Event {e.id} ({e.to_name}) - Media count: {len(e.media_list)}")
    return events

@router.post("/simple")
async def create_simple_trip(req: SimpleTripRequest, session: Session = Depends(get_session)):
    # 1. Create Trip
    trip = Trip(title=req.title)
    session.add(trip)
    session.flush()
    
    # 2. Resolve Start City
    prev_lat, prev_lng = geocode_city(req.start_city)
    if prev_lat is None:
        raise HTTPException(status_code=400, detail=f"Could not resolve city: {req.start_city}")
    
    prev_city = req.start_city
    prev_date = req.start_date
    
    # 3. Create Events for each leg
    event_ids = []
    for leg in req.legs:
        dest_lat, dest_lng = geocode_city(leg.city_name)
        if dest_lat is None:
            event_ids.append(None)
            continue 
            
        event = TravelEvent(
            trip_id=trip.id,
            title=f"Travel from {prev_city} to {leg.city_name}",
            from_name=prev_city,
            to_name=leg.city_name,
            from_lat=prev_lat,
            from_lng=prev_lng,
            to_lat=dest_lat,
            to_lng=dest_lng,
            start_datetime=leg.arrival_date,
            transport="plane"
        )
        session.add(event)
        session.flush() # Get ID
        event_ids.append(event.id)
        
        # Move state for next leg
        prev_city = leg.city_name
        prev_lat, prev_lng = dest_lat, dest_lng
        prev_date = leg.arrival_date
        
    session.commit()
    return {"trip_id": trip.id, "event_ids": event_ids}

@router.post("/{event_id}/media")
async def upload_media(event_id: int, files: List[UploadFile] = File(...), session: Session = Depends(get_session)):
    db_event = session.get(TravelEvent, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    endpoint = os.getenv('MINIO_ENDPOINT', 'http://minio:9000')
    s3 = boto3.client(
        's3',
        endpoint_url=endpoint if endpoint.startswith('http') else f"http://{endpoint}",
        aws_access_key_id=os.getenv('MINIO_ACCESS_KEY', 'minioadmin'),
        aws_secret_access_key=os.getenv('MINIO_SECRET_KEY', 'minioadmin')
    )
    bucket_name = os.getenv('MINIO_BUCKET', 'voyage-media')
    
    # Ensure bucket exists
    try:
        s3.head_bucket(Bucket=bucket_name)
    except:
        s3.create_bucket(Bucket=bucket_name)
        # Apply public read policy to new bucket
        policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Sid": "PublicRead",
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
            }]
        }
        s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
        print(f"DEBUG: Created bucket {bucket_name} and applied public read policy")

    new_media_list = []
    print(f"DEBUG: upload_media started for event {event_id} with {len(files)} files")
    for file in files:
        await file.seek(0)
        file_path = f"events/{event_id}/{file.filename}"
        s3.upload_fileobj(file.file, bucket_name, file_path)
        print(f"DEBUG: File {file.filename} uploaded to S3 path: {file_path}")
        
        # URL encode the filename to handle spaces/special chars
        encoded_filename = urllib.parse.quote(file.filename)
        encoded_file_path = f"events/{event_id}/{encoded_filename}"
        
        # Use request URL or ENV to determine public access URL
        # For PoC, we still use localhost:9999 but allow override via ENV
        public_url_base = os.getenv('MEDIA_PUBLIC_URL', 'http://localhost:9999')
        
        # Determine media type
        lower_filename = file.filename.lower()
        if "pano" in lower_filename:
            m_type = "pano_image"
        elif any(lower_filename.endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv']):
            m_type = "video"
        else:
            m_type = "image"
            
        media = EventMedia(
            event_id=event_id,
            url=f"{public_url_base}/{bucket_name}/{encoded_file_path}", # Direct Minio access
            media_type=m_type
        )
        session.add(media)
        # We need to refresh to get ID if needed, but since we are iterating, we can flush or just wait for commit.
        # However, flushing inside loop is slow.
        # But we need to return objects with IDs.
        # Let's commit once at end, then refresh created objects or just refresh all?
        # Alternatively, add to list, commit, then list will effectively have IDs if we refresh them or just reload.
        new_media_list.append(media)
        print(f"DEBUG: Created EventMedia record: {media.url}")
    
    session.commit()
    # Refresh objects to get IDs
    for media in new_media_list:
        session.refresh(media)
        
    print(f"DEBUG: upload_media committed for event {event_id}")
    return new_media_list


@router.post("/", response_model=TravelEvent)
def create_event(event: TravelEvent, session: Session = Depends(get_session)):
    session.add(event)
    session.commit()
    session.refresh(event)
    return event

@router.patch("/{event_id}", response_model=TravelEvent)
def update_event(event_id: int, event_data: dict, session: Session = Depends(get_session)):
    db_event = session.get(TravelEvent, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    for key, value in event_data.items():
        setattr(db_event, key, value)
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event

@router.delete("/{event_id}")
def delete_event(event_id: int, session: Session = Depends(get_session)):
    db_event = session.get(TravelEvent, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(db_event)
    session.commit()
    return {"ok": True}

@router.delete("/media/{media_id}")
def delete_media(media_id: int, session: Session = Depends(get_session)):
    db_media = session.get(EventMedia, media_id)
    if not db_media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Attempt to delete from Minio
    try:
        endpoint = os.getenv('MINIO_ENDPOINT', 'http://minio:9000')
        s3 = boto3.client(
            's3',
            endpoint_url=endpoint if endpoint.startswith('http') else f"http://{endpoint}",
            aws_access_key_id=os.getenv('MINIO_ACCESS_KEY', 'minioadmin'),
            aws_secret_access_key=os.getenv('MINIO_SECRET_KEY', 'minioadmin')
        )
        bucket_name = os.getenv('MINIO_BUCKET', 'voyage-media')
        
        # Extract object key from URL
        # URL format: http://host:port/bucket_name/path/to/file
        # We need 'path/to/file'
        
        # Simple parsing logic assuming standard structure
        parts = db_media.url.split(f"/{bucket_name}/")
        if len(parts) > 1:
            object_key = parts[1]
            # Decode URL encoded characters (e.g. %20 -> space) if strictly needed, 
            # but usually S3 keys handling via boto3 might expect the exact key used during upload.
            # During upload we used: events/{event_id}/{encoded_filename}
            # So the URL component IS the key as stored in S3 (since we stored encoded path).
            
            s3.delete_object(Bucket=bucket_name, Key=object_key)
            print(f"DEBUG: Deleted S3 object {object_key}")
    except Exception as e:
        print(f"ERROR: Failed to delete media from Minio: {e}")
        # We proceed to delete from DB even if S3 fails, to keep app consistent? 
        # Or fail? Let's log and proceed to avoid orphaned DB records blocking UI.

    session.delete(db_media)
    session.commit()
    return {"ok": True}

@router.delete("/all/clear")
def delete_all_events(session: Session = Depends(get_session)):
    events = session.exec(select(TravelEvent)).all()
    for event in events:
        session.delete(event)
    session.commit()
    return {"ok": True}
