from fastapi import APIRouter, HTTPException, Query

from utils.geocoder import geocode_city, reverse_geocode_coords

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("")
def geocode(
    q: str | None = Query(default=None),
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
):
    if lat is not None and lng is not None:
        try:
            return reverse_geocode_coords(lat, lng)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if q:
        found_lat, found_lng = geocode_city(q)
        if found_lat is None or found_lng is None:
            raise HTTPException(status_code=404, detail=f"Could not resolve location: {q}")
        return {"name": q.strip(), "lat": found_lat, "lng": found_lng, "source": "search"}

    raise HTTPException(status_code=400, detail="Provide either q or both lat and lng")
