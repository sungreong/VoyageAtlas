from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from models import TravelEvent, Trip, EventMedia, TripPreparation
import boto3
import os
from database import get_session
from utils.geocoder import geocode_city
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import urllib.parse
import tempfile
import shutil
from utils.media_analyzer import analyze_media
from utils.clustering import cluster_media_to_suggestions
from utils.media_utils import get_media_type
import pandas as pd
from io import BytesIO

def get_s3_client():
    endpoint = os.getenv('MINIO_ENDPOINT', 'http://minio:9000')
    return boto3.client(
        's3',
        endpoint_url=endpoint if endpoint.startswith('http') else f"http://{endpoint}",
        aws_access_key_id=os.getenv('MINIO_ACCESS_KEY', 'minioadmin'),
        aws_secret_access_key=os.getenv('MINIO_SECRET_KEY', 'minioadmin')
    )

router = APIRouter(prefix="/events", tags=["events"])

class ItineraryLeg(BaseModel):
    city_name: str
    arrival_date: datetime

class EventMediaRead(BaseModel):
    id: int
    url: str
    media_type: str
    event_id: int
    # Intelligence fields
    captured_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None
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

class TripRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    note: Optional[str] = None
    cost: Optional[float] = None
    created_at: datetime
    events: List[TravelEventRead] = []
    model_config = ConfigDict(from_attributes=True)

class SimpleTripRequest(BaseModel):
    title: str
    start_city: str
    start_date: datetime
    legs: List[ItineraryLeg]

@router.get("/trips", response_model=List[TripRead])
def read_trips(session: Session = Depends(get_session)):
    """
    Get all trips with their events hierarchically.
    """
    trips = session.exec(
        select(Trip)
        .options(selectinload(Trip.events).selectinload(TravelEvent.media_list))
        .order_by(Trip.created_at.desc())
    ).all()
    return trips

@router.get("/trips/summary")
def get_trips_summary(session: Session = Depends(get_session)):
    """
    Lightweight trip summary for export UI.
    Returns id, title, date range, and visited destinations per trip.
    """
    trips = session.exec(
        select(Trip)
        .options(selectinload(Trip.events))
        .order_by(Trip.created_at.desc())
    ).all()

    result = []
    for trip in trips:
        events = trip.events
        if events:
            dates = [e.start_datetime for e in events]
            start = min(dates)
            end = max(dates)
            destinations = list(dict.fromkeys(e.to_name for e in sorted(events, key=lambda e: e.start_datetime)))
        else:
            start = end = None
            destinations = []

        result.append({
            "id": trip.id,
            "title": trip.title,
            "start_date": start.isoformat() if start else None,
            "end_date": end.isoformat() if end else None,
            "destinations": destinations,
            "event_count": len(events)
        })

    return result

@router.get("/", response_model=List[TravelEventRead])
def read_events(session: Session = Depends(get_session)):
    events = session.exec(select(TravelEvent).options(selectinload(TravelEvent.media_list)).order_by(TravelEvent.start_datetime)).all()
    print(f"DEBUG: read_events found {len(events)} events")
    for e in events:
        print(f"DEBUG: Event {e.id} ({e.to_name}) - Media count: {len(e.media_list)}")
    return events

@router.post("/simple")
async def create_simple_trip(req: SimpleTripRequest, session: Session = Depends(get_session)):
    # 1. Resolve all locations BEFORE starting DB transaction to avoid locking
    # Resolve Start City
    start_lat, start_lng = geocode_city(req.start_city)
    if start_lat is None:
        raise HTTPException(status_code=400, detail=f"Could not resolve start city: {req.start_city}")
    
    legs_with_coords = []
    for leg in req.legs:
        dest_lat, dest_lng = geocode_city(leg.city_name)
        if dest_lat is None:
            raise HTTPException(status_code=400, detail=f"Could not resolve leg city: {req.city_name}")
        legs_with_coords.append((leg, dest_lat, dest_lng))

    # 2. Database Operations
    # 2.1 Create Trip
    trip = Trip(title=req.title)
    session.add(trip)
    session.flush() # Get trip ID
    
    # 2.2 Create Events for each leg
    event_ids = []
    current_date = req.start_date
    current_city = req.start_city
    current_lat, current_lng = start_lat, start_lng
    
    for leg, dest_lat, dest_lng in legs_with_coords:
        # Create Event
        evt = TravelEvent(
            trip_id=trip.id,
            start_datetime=current_date,
            from_name=current_city,
            to_name=leg.city_name,
            from_lat=current_lat,
            from_lng=current_lng,
            to_lat=dest_lat,
            to_lng=dest_lng,
            transport="plane",
            title=f"Flight to {leg.city_name}"
        )
        session.add(evt)
        session.flush()
        event_ids.append(evt.id)
        
        # Update for next
        current_city = leg.city_name
        current_lat, current_lng = dest_lat, dest_lng
        current_date = leg.arrival_date
    
    session.commit()
    return {"trip_id": trip.id, "event_ids": event_ids}

# --- Trip Preparation Endpoints ---

@router.get("/trips/{trip_id}/preparations", response_model=List[TripPreparation])
def get_preparations(trip_id: int, session: Session = Depends(get_session)):
    return session.exec(select(TripPreparation).where(TripPreparation.trip_id == trip_id)).all()

@router.post("/trips/{trip_id}/preparations", response_model=TripPreparation)
def create_preparation(trip_id: int, prep: TripPreparation, session: Session = Depends(get_session)):
    prep.trip_id = trip_id
    session.add(prep)
    session.commit()
    session.refresh(prep)
    return prep

@router.patch("/preparations/{prep_id}", response_model=TripPreparation)
def update_preparation(prep_id: int, prep_data: dict, session: Session = Depends(get_session)):
    db_prep = session.get(TripPreparation, prep_id)
    if not db_prep:
        raise HTTPException(status_code=404, detail="Preparation item not found")
    
    prep_dict = prep_data
    for key, value in prep_dict.items():
        setattr(db_prep, key, value)
    
    session.add(db_prep)
    session.commit()
    session.refresh(db_prep)
    return db_prep

@router.delete("/preparations/{prep_id}")
def delete_preparation(prep_id: int, session: Session = Depends(get_session)):
    db_prep = session.get(TripPreparation, prep_id)
    if not db_prep:
        raise HTTPException(status_code=404, detail="Preparation item not found")
    session.delete(db_prep)
    session.commit()
    return {"ok": True}

class TripUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    note: Optional[str] = None
    cost: Optional[float] = None

@router.patch("/trips/{trip_id}", response_model=TripRead)
def update_trip(trip_id: int, trip_update: TripUpdate, session: Session = Depends(get_session)):
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip_data = trip_update.model_dump(exclude_unset=True)
    for key, value in trip_data.items():
        setattr(trip, key, value)
        
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip



@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: int, session: Session = Depends(get_session)):
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Manually delete events to ensure cascade
    for event in trip.events:
        session.delete(event)
        
    session.delete(trip)
    session.commit()
    return {"ok": True}

@router.post("/{event_id}/media")
async def upload_media(event_id: int, files: List[UploadFile] = File(...), session: Session = Depends(get_session)):
    db_event = session.get(TravelEvent, event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    s3 = get_s3_client()
    bucket_name = os.getenv('MINIO_BUCKET', 'voyage-media')

    new_media_list = []
    print(f"DEBUG: upload_media started for event {event_id} with {len(files)} files")
    for file in files:
        # Create a temporary file to analyze it locally before uploading to S3
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            # 1. Intelligence: Analyze metadata
            intelligence = analyze_media(tmp_path)
            print(f"DEBUG: Intelligence for {file.filename}: {intelligence}")

            # 2. Intelligence: Auto-Destination Logic
            # If the photo has a city, check if it exists in this trip. If not, create it.
            target_event_id = event_id
            photo_city = intelligence.get("city")
            if photo_city:
                trip_id = db_event.trip_id
                # Search for an event with this city name in the same trip
                existing_event = session.exec(
                    select(TravelEvent).where(
                        TravelEvent.trip_id == trip_id, 
                        TravelEvent.to_name == photo_city
                    )
                ).first()
                
                if existing_event:
                    target_event_id = existing_event.id
                else:
                    # Create a new event for this destination automatically
                    print(f"DEBUG: Creating new destination '{photo_city}' for trip {trip_id}")
                    new_evt = TravelEvent(
                        trip_id=trip_id,
                        title=f"Visit to {photo_city}",
                        to_name=photo_city,
                        from_name=db_event.to_name, # Default from current
                        from_lat=db_event.to_lat,
                        from_lng=db_event.to_lng,
                        to_lat=intelligence.get("lat") or 0,
                        to_lng=intelligence.get("lng") or 0,
                        start_datetime=intelligence.get("captured_at") or datetime.now(),
                        transport="car" # Assume car/bus for auto-detected local spots
                    )
                    session.add(new_evt)
                    session.flush() # Get the new ID
                    target_event_id = new_evt.id

            # 3. Upload to S3
            with open(tmp_path, 'rb') as f_data:
                s3.upload_fileobj(f_data, bucket_name, f"events/{target_event_id}/{file.filename}")
            
            # URL encode the filename
            encoded_filename = urllib.parse.quote(file.filename)
            encoded_file_path = f"events/{target_event_id}/{encoded_filename}"
            public_url_base = os.getenv('MEDIA_PUBLIC_URL', 'http://localhost:9999')
            
            # Determine media type
            m_type = get_media_type(file.filename)
                
            media = EventMedia(
                event_id=target_event_id,
                url=f"{public_url_base}/{bucket_name}/{encoded_file_path}",
                media_type=m_type,
                captured_at=intelligence.get("captured_at"),
                lat=intelligence.get("lat"),
                lng=intelligence.get("lng"),
                city=intelligence.get("city"),
                country=intelligence.get("country")
            )
            session.add(media)
            new_media_list.append(media)
            
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    session.commit()
    for media in new_media_list:
        session.refresh(media)
        
    return new_media_list

@router.post("/analyze")
async def analyze_files(files: List[UploadFile] = File(...)):
    """
    Intelligent bulk analysis for suggestion workflow.
    Takes multiple files, extracts metadata, and clusters them into travel event suggestions.
    """
    analyzed_data = []
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        
        try:
            intelligence = analyze_media(tmp_path)
            analyzed_data.append({
                "filename": file.filename,
                "intelligence": intelligence
            })
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    # Use clustering logic to group into suggested events
    suggestions = cluster_media_to_suggestions(analyzed_data)
    
    return {
        "analyzed_count": len(files),
        "suggestions": suggestions
    }


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
        if key == "start_datetime" and isinstance(value, str):
            try:
                # Convert ISO string directly to datetime object
                value = datetime.fromisoformat(value)
            except ValueError:
                pass # Fallback or let it fail if invalid format
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
        s3 = get_s3_client()
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

@router.get("/export")
def export_data(
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    session: Session = Depends(get_session)
):
    query = select(TravelEvent).options(selectinload(TravelEvent.media_list))
    
    if start_date:
        query = query.where(TravelEvent.start_datetime >= start_date)
    if end_date:
        query = query.where(TravelEvent.start_datetime <= end_date)
        
    events = session.exec(query.order_by(TravelEvent.start_datetime)).all()
    
    # Group by Trip
    trips_data = {}
    for event in events:
        trip_id = event.trip_id
        if trip_id not in trips_data:
            # Get Trip title
            trip = session.get(Trip, trip_id)
            trips_data[trip_id] = {
                "title": trip.title if trip else "Unnamed Trip",
                "events": []
            }
        
        # Serialize event
        event_dict = {
            "title": event.title,
            "from_name": event.from_name,
            "to_name": event.to_name,
            "from_lat": event.from_lat,
            "from_lng": event.from_lng,
            "to_lat": event.to_lat,
            "to_lng": event.to_lng,
            "start_datetime": event.start_datetime.isoformat(),
            "transport": event.transport,
            "note": event.note
        }
        trips_data[trip_id]["events"].append(event_dict)
        
    return {
        "version": "1.0",
        "export_date": datetime.now().isoformat(),
        "trips": list(trips_data.values())
    }

@router.post("/import")
async def import_data(data: dict, session: Session = Depends(get_session)):
    if "trips" not in data:
        raise HTTPException(status_code=400, detail="Invalid data format: 'trips' key missing")
    
    import_count_trips = 0
    import_count_events = 0
    
    for trip_data in data["trips"]:
        # Create Trip
        new_trip = Trip(title=trip_data.get("title", "Imported Trip"))
        session.add(new_trip)
        session.flush() # Get Trip ID
        import_count_trips += 1
        
        for e_data in trip_data.get("events", []):
            new_event = TravelEvent(
                trip_id=new_trip.id,
                title=e_data.get("title"),
                from_name=e_data.get("from_name"),
                to_name=e_data.get("to_name"),
                from_lat=e_data.get("from_lat"),
                from_lng=e_data.get("from_lng"),
                to_lat=e_data.get("to_lat"),
                to_lng=e_data.get("to_lng"),
                start_datetime=datetime.fromisoformat(e_data.get("start_datetime")),
                transport=e_data.get("transport", "plane"),
                note=e_data.get("note")
            )
            session.add(new_event)
            import_count_events += 1
            
    session.commit()
    return {
        "status": "success",
        "imported_trips": import_count_trips,
        "imported_events": import_count_events
    }

# Enhanced Export Helper Functions

def build_basic_export_data(trips_with_events):
    """Extract basic route data (from→to) excluding media"""
    result = {
        "version": "2.0",
        "export_date": datetime.now().isoformat(),
        "detail_level": "basic",
        "trips": []
    }

    for trip in trips_with_events:
        trip_data = {
            "trip_id": trip.id,
            "trip_title": trip.title,
            "routes": []
        }

        for event in trip.events:
            route = {
                "from": event.from_name,
                "to": event.to_name,
                "from_lat": event.from_lat,
                "from_lng": event.from_lng,
                "to_lat": event.to_lat,
                "to_lng": event.to_lng,
                "date": event.start_datetime.isoformat(),
                "transport": event.transport
            }
            trip_data["routes"].append(route)

        result["trips"].append(trip_data)

    return result

def build_detailed_export_data(trips_with_events, session):
    """Extract detailed metadata including trip info and preparations"""
    result = {
        "version": "2.0",
        "export_date": datetime.now().isoformat(),
        "detail_level": "detailed",
        "trips": []
    }

    for trip in trips_with_events:
        # Get preparations for this trip
        preps = session.exec(
            select(TripPreparation).where(TripPreparation.trip_id == trip.id)
        ).all()

        trip_data = {
            "trip_id": trip.id,
            "trip_title": trip.title,
            "trip_description": trip.description,
            "trip_note": trip.note,
            "trip_cost": trip.cost,
            "created_at": trip.created_at.isoformat(),
            "routes": [],
            "preparations": []
        }

        for event in trip.events:
            route = {
                "event_id": event.id,
                "title": event.title,
                "from": event.from_name,
                "to": event.to_name,
                "from_lat": event.from_lat,
                "from_lng": event.from_lng,
                "to_lat": event.to_lat,
                "to_lng": event.to_lng,
                "date": event.start_datetime.isoformat(),
                "transport": event.transport,
                "note": event.note
            }
            trip_data["routes"].append(route)

        for prep in preps:
            trip_data["preparations"].append({
                "category": prep.category,
                "item": prep.item_name,
                "checked": prep.is_checked
            })

        result["trips"].append(trip_data)

    return result

def export_to_excel_basic(data):
    """Convert basic export data to Excel BytesIO"""
    rows = []
    for trip in data["trips"]:
        for route in trip["routes"]:
            rows.append({
                "Trip Title": trip["trip_title"],
                "From": route["from"],
                "To": route["to"],
                "From Latitude": route["from_lat"],
                "From Longitude": route["from_lng"],
                "To Latitude": route["to_lat"],
                "To Longitude": route["to_lng"],
                "Date": route["date"],
                "Transport": route["transport"]
            })

    df = pd.DataFrame(rows)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Routes', index=False)

    output.seek(0)
    return output

def export_to_excel_detailed(data):
    """Convert detailed export data to multi-sheet Excel"""
    # Sheet 1: Trips
    trip_rows = []
    for trip in data["trips"]:
        trip_rows.append({
            "Trip ID": trip["trip_id"],
            "Title": trip["trip_title"],
            "Description": trip.get("trip_description"),
            "Note": trip.get("trip_note"),
            "Cost": trip.get("trip_cost"),
            "Created At": trip["created_at"]
        })

    # Sheet 2: Routes
    route_rows = []
    for trip in data["trips"]:
        for route in trip["routes"]:
            route_rows.append({
                "Trip Title": trip["trip_title"],
                "Event ID": route["event_id"],
                "Event Title": route["title"],
                "From": route["from"],
                "To": route["to"],
                "From Latitude": route["from_lat"],
                "From Longitude": route["from_lng"],
                "To Latitude": route["to_lat"],
                "To Longitude": route["to_lng"],
                "Date": route["date"],
                "Transport": route["transport"],
                "Note": route.get("note")
            })

    # Sheet 3: Preparations
    prep_rows = []
    for trip in data["trips"]:
        for prep in trip.get("preparations", []):
            prep_rows.append({
                "Trip Title": trip["trip_title"],
                "Category": prep["category"],
                "Item": prep["item"],
                "Checked": prep["checked"]
            })

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        pd.DataFrame(trip_rows).to_excel(writer, sheet_name='Trips', index=False)
        pd.DataFrame(route_rows).to_excel(writer, sheet_name='Routes', index=False)
        if prep_rows:
            pd.DataFrame(prep_rows).to_excel(writer, sheet_name='Preparations', index=False)

    output.seek(0)
    return output

@router.get("/export/enhanced")
def export_enhanced(
    format: str = "json",
    detail_level: str = "basic",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    trip_ids: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Enhanced export with format and detail level options.

    - format: "json" or "excel"
    - detail_level: "basic" (routes only) or "detailed" (full metadata)
    - trip_ids: comma-separated trip IDs to filter (e.g. "1,3,5"). If omitted, exports all.
    - Excludes all media URLs and EXIF data
    """
    # Validate parameters
    if format not in ["json", "excel"]:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'json' or 'excel'")

    if detail_level not in ["basic", "detailed"]:
        raise HTTPException(status_code=400, detail="Invalid detail_level. Use 'basic' or 'detailed'")

    # Build query
    query = select(Trip).options(selectinload(Trip.events))

    # Apply trip_ids filter if provided
    if trip_ids:
        parsed_ids = [int(i.strip()) for i in trip_ids.split(',') if i.strip().isdigit()]
        if parsed_ids:
            trips_data = session.exec(
                query.where(Trip.id.in_(parsed_ids)).order_by(Trip.created_at.desc())
            ).all()
        else:
            trips_data = []
    # Apply date filtering if provided (filter on earliest event in trip)
    elif start_date or end_date:
        # Convert timezone-aware datetimes to naive for comparison
        start_date_naive = start_date.replace(tzinfo=None) if start_date else None
        end_date_naive = end_date.replace(tzinfo=None) if end_date else None

        trips = session.exec(query).all()
        filtered_trips = []
        for trip in trips:
            if not trip.events:
                continue
            trip_dates = [e.start_datetime for e in trip.events]
            earliest = min(trip_dates)
            latest = max(trip_dates)

            if start_date_naive and latest < start_date_naive:
                continue
            if end_date_naive and earliest > end_date_naive:
                continue

            filtered_trips.append(trip)
        trips_data = filtered_trips
    else:
        trips_data = session.exec(query.order_by(Trip.created_at.desc())).all()

    # Build export data structure
    if detail_level == "basic":
        export_data = build_basic_export_data(trips_data)
    else:
        export_data = build_detailed_export_data(trips_data, session)

    # Generate filename
    date_str = datetime.now().strftime("%Y-%m-%d")

    # Return based on format
    if format == "json":
        filename = f"voyage_atlas_export_{detail_level}_{date_str}.json"
        return JSONResponse(
            content=export_data,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    else:  # excel
        if detail_level == "basic":
            excel_file = export_to_excel_basic(export_data)
        else:
            excel_file = export_to_excel_detailed(export_data)

        filename = f"voyage_atlas_export_{detail_level}_{date_str}.xlsx"

        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

@router.delete("/all/clear")
def delete_all_events(session: Session = Depends(get_session)):
    events = session.exec(select(TravelEvent)).all()
    for event in events:
        session.delete(event)
    # Also delete orphan trips
    trips = session.exec(select(Trip)).all()
    for trip in trips:
        session.delete(trip)
    session.commit()
    return {"ok": True}
