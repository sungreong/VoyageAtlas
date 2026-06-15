from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session, select

from database import get_session
from models import LocationFavorite
from utils.geocoder import reverse_geocode_coords

router = APIRouter(prefix="/location-favorites", tags=["location-favorites"])
LOCATION_METADATA_FIELDS = ("city", "region", "country", "display_name", "source")


class LocationFavoritePayload(BaseModel):
    name: Optional[str] = None
    lat: float
    lng: float
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    display_name: Optional[str] = None
    source: Optional[str] = None


class LocationFavoritePatch(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    display_name: Optional[str] = None
    source: Optional[str] = None


class LocationFavoriteRead(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    display_name: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


def validate_coordinate(lat: float, lng: float) -> tuple[float, float]:
    lat = float(lat)
    lng = float(lng)
    if not -90 <= lat <= 90 or not -180 <= lng <= 180:
        raise HTTPException(status_code=400, detail="위도는 -90~90, 경도는 -180~180 사이여야 합니다.")
    return lat, lng


def default_name_for(lat: float, lng: float) -> str:
    try:
        result = reverse_geocode_coords(lat, lng)
        return result.get("name") or f"Saved location {lat:.3f}, {lng:.3f}"
    except Exception:
        return f"Saved location {lat:.3f}, {lng:.3f}"


def infer_location_details(lat: float, lng: float) -> dict:
    try:
        result = reverse_geocode_coords(lat, lng)
    except Exception:
        return {}

    return {
        key: result.get(key)
        for key in ("name", *LOCATION_METADATA_FIELDS)
        if result.get(key) is not None
    }


@router.get("/", response_model=List[LocationFavoriteRead])
def read_location_favorites(session: Session = Depends(get_session)):
    return session.exec(select(LocationFavorite).order_by(LocationFavorite.updated_at.desc())).all()


@router.post("/", response_model=LocationFavoriteRead)
def create_location_favorite(payload: LocationFavoritePayload, session: Session = Depends(get_session)):
    lat, lng = validate_coordinate(payload.lat, payload.lng)
    signature_lat = round(lat, 4)
    signature_lng = round(lng, 4)
    duplicate = session.exec(
        select(LocationFavorite).where(
            LocationFavorite.lat >= signature_lat - 0.00005,
            LocationFavorite.lat <= signature_lat + 0.00005,
            LocationFavorite.lng >= signature_lng - 0.00005,
            LocationFavorite.lng <= signature_lng + 0.00005,
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="이미 저장된 좌표입니다.")

    inferred = infer_location_details(lat, lng)
    favorite = LocationFavorite(
        name=(payload.name or "").strip() or inferred.get("name") or default_name_for(lat, lng),
        lat=lat,
        lng=lng,
        city=payload.city or inferred.get("city"),
        region=payload.region or inferred.get("region"),
        country=payload.country or inferred.get("country"),
        display_name=payload.display_name or inferred.get("display_name"),
        source=payload.source or inferred.get("source"),
    )
    session.add(favorite)
    session.commit()
    session.refresh(favorite)
    return favorite


@router.patch("/{favorite_id}", response_model=LocationFavoriteRead)
def update_location_favorite(
    favorite_id: int,
    payload: LocationFavoritePatch,
    session: Session = Depends(get_session),
):
    favorite = session.get(LocationFavorite, favorite_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="즐겨찾기를 찾을 수 없습니다.")

    update = payload.model_dump(exclude_unset=True)
    coordinate_changed = "lat" in update or "lng" in update
    if "lat" in update or "lng" in update:
        lat = update.get("lat", favorite.lat)
        lng = update.get("lng", favorite.lng)
        update["lat"], update["lng"] = validate_coordinate(lat, lng)

    inferred = {}
    metadata_provided = any(field in update for field in LOCATION_METADATA_FIELDS)
    if coordinate_changed and not metadata_provided:
        inferred = infer_location_details(update.get("lat", favorite.lat), update.get("lng", favorite.lng))
        for field in LOCATION_METADATA_FIELDS:
            if field in inferred:
                update[field] = inferred[field]

    if "name" in update:
        update["name"] = (update["name"] or "").strip() or default_name_for(
            update.get("lat", favorite.lat),
            update.get("lng", favorite.lng),
        )

    for key, value in update.items():
        setattr(favorite, key, value)
    favorite.updated_at = datetime.utcnow()
    session.add(favorite)
    session.commit()
    session.refresh(favorite)
    return favorite


@router.delete("/{favorite_id}")
def delete_location_favorite(favorite_id: int, session: Session = Depends(get_session)):
    favorite = session.get(LocationFavorite, favorite_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="즐겨찾기를 찾을 수 없습니다.")

    session.delete(favorite)
    session.commit()
    return {"ok": True}
